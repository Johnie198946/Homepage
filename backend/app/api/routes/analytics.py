import hashlib
from datetime import UTC, datetime, timedelta

from cachetools import TTLCache
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db
from app.core.config import settings
from app.core.rate_limit import limiter
from app.db.session import SessionLocal
from app.models.analytics_event import AnalyticsEvent
from app.models.photo import Photo
from app.schemas.analytics import (
  AnalyticsEventIn,
  ButtonClickItem,
  ButtonClicksOut,
  PageViewItem,
  PageViewsOut,
  TopPhotoOut,
)
from app.services.analytics import ensure_required_analytics_partitions, logger, normalize_event_timestamp


router = APIRouter(prefix="/analytics")

_cache = TTLCache(maxsize=256, ttl=300)
_ALLOWED_EVENT_TYPES = {"page_view", "button_click", "photo_view"}


def _hash_ip(ip: str) -> str:
  return hashlib.sha256(f"{settings.jwt_secret}:{ip}".encode("utf-8")).hexdigest()


def _range_to_since(range_: str | None) -> tuple[str, datetime]:
  mapping = {"7d": 7, "30d": 30, "90d": 90}
  days = mapping.get(range_ or "")
  if not days:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid range")
  assert range_ is not None
  return range_, datetime.now(UTC) - timedelta(days=days)


def _parse_limit(limit_raw: str | None) -> int:
  if limit_raw in (None, ""):
    return 10
  try:
    limit = int(limit_raw)
  except (TypeError, ValueError) as exc:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid limit") from exc
  if not 1 <= limit <= 100:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid limit")
  return limit


def _validate_event_payload(payload: AnalyticsEventIn) -> AnalyticsEventIn:
  payload.event_type = payload.event_type.strip()
  payload.page = payload.page.strip()
  payload.target_type = payload.target_type.strip()
  payload.target_id = payload.target_id.strip()

  if payload.event_type not in _ALLOWED_EVENT_TYPES:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid event_type")

  if payload.event_type == "page_view":
    if not payload.target_id:
      payload.target_id = payload.page
  elif not payload.target_id:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="target_id is required")

  if not payload.target_id:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="target_id is required")

  return payload


def _media_url_for_photo(photo: Photo, variant: str | None = None) -> str:
  if variant == "thumb" and photo.thumb_key:
    return f"/api/photos/{photo.id}/media?variant=thumb"
  return f"/api/photos/{photo.id}/media"


def _insert_event(payload_data: dict[str, object], client_ip: str, user_agent: str, referer: str):
  db = SessionLocal()
  try:
    payload = AnalyticsEventIn.model_validate(payload_data)
    event_time = normalize_event_timestamp(payload.timestamp)
    ensure_required_analytics_partitions(db, reference_time=event_time, months_ahead=1)

    page = payload.page
    if payload.event_type == "page_view" and not page:
      page = payload.target_id

    db.add(
      AnalyticsEvent(
        event_type=payload.event_type,
        page=page,
        target_type=payload.target_type,
        target_id=payload.target_id,
        meta=payload.meta,
        ip_hash=_hash_ip(client_ip),
        referer=referer,
        user_agent=user_agent,
        created_at=event_time,
      )
    )
    db.commit()
  except Exception:
    db.rollback()
    logger.exception("Failed to persist analytics event")
  finally:
    db.close()


@router.post("/events", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit(settings.analytics_rate_limit)
def post_event(
  payload: AnalyticsEventIn,
  request: Request,
  bg: BackgroundTasks,
):
  payload = _validate_event_payload(payload)
  client_ip = request.client.host if request.client else ""
  referer = request.headers.get("referer", "")
  user_agent = request.headers.get("user-agent", "")
  bg.add_task(_insert_event, payload.model_dump(), client_ip, user_agent, referer)
  return {"accepted": True}


@router.get("/pageviews", response_model=PageViewsOut)
def pageviews(
  range_: str | None = Query(default=None, alias="range"),
  _admin=Depends(get_current_admin),
  db: Session = Depends(get_db),
):
  range_value, since = _range_to_since(range_)
  cache_key = ("pageviews", range_value)
  if cache_key in _cache:
    return _cache[cache_key]

  page_expr = func.coalesce(func.nullif(AnalyticsEvent.page, ""), AnalyticsEvent.target_id)
  rows = (
    db.query(page_expr.label("page"), func.count(AnalyticsEvent.id).label("views"))
    .filter(AnalyticsEvent.event_type == "page_view", AnalyticsEvent.created_at >= since)
    .group_by(page_expr)
    .order_by(func.count(AnalyticsEvent.id).desc(), page_expr.asc())
    .all()
  )
  items = [PageViewItem(page=page or "/", views=int(views)) for page, views in rows]
  total = sum(item.views for item in items)
  out = PageViewsOut(range=range_value, total=total, items=items)
  _cache[cache_key] = out
  return out


@router.get("/top-photos", response_model=list[TopPhotoOut])
def top_photos(
  limit: str | None = Query(default=None),
  _admin=Depends(get_current_admin),
  db: Session = Depends(get_db),
):
  limit_value = _parse_limit(limit)
  cache_key = ("top-photos", limit_value)
  if cache_key in _cache:
    return _cache[cache_key]

  rows = (
    db.query(AnalyticsEvent.target_id, func.count(AnalyticsEvent.id).label("views"))
    .filter(
      AnalyticsEvent.event_type == "photo_view",
      AnalyticsEvent.target_id != "",
    )
    .group_by(AnalyticsEvent.target_id)
    .order_by(func.count(AnalyticsEvent.id).desc(), AnalyticsEvent.target_id.asc())
    .limit(limit_value)
    .all()
  )

  photo_ids: list[int] = []
  for target_id, _views in rows:
    try:
      photo_ids.append(int(target_id))
    except (TypeError, ValueError):
      continue

  photo_map = {
    photo.id: photo for photo in db.query(Photo).filter(Photo.id.in_(photo_ids)).all()
  } if photo_ids else {}

  out: list[TopPhotoOut] = []
  for target_id, views in rows:
    try:
      photo_id = int(target_id)
    except (TypeError, ValueError):
      continue

    photo = photo_map.get(photo_id)
    out.append(
      TopPhotoOut(
        photo_id=photo_id,
        views=int(views),
        title_en=photo.title_en if photo else "",
        title_zh=photo.title_zh if photo else "",
        media_url=_media_url_for_photo(photo) if photo else None,
        thumb_url=_media_url_for_photo(photo, "thumb") if photo and photo.thumb_key else None,
      )
    )

  _cache[cache_key] = out
  return out


@router.get("/button-clicks", response_model=ButtonClicksOut)
def button_clicks(
  range_: str | None = Query(default=None, alias="range"),
  _admin=Depends(get_current_admin),
  db: Session = Depends(get_db),
):
  range_value, since = _range_to_since(range_)
  cache_key = ("button-clicks", range_value)
  if cache_key in _cache:
    return _cache[cache_key]

  target_expr = func.coalesce(func.nullif(AnalyticsEvent.target_id, ""), AnalyticsEvent.page)
  rows = (
    db.query(target_expr.label("target_id"), func.count(AnalyticsEvent.id).label("clicks"))
    .filter(AnalyticsEvent.event_type == "button_click", AnalyticsEvent.created_at >= since)
    .group_by(target_expr)
    .order_by(func.count(AnalyticsEvent.id).desc(), target_expr.asc())
    .all()
  )

  items = [ButtonClickItem(target_id=target_id or "", clicks=int(clicks)) for target_id, clicks in rows]
  total = sum(item.clicks for item in items)
  out = ButtonClicksOut(range=range_value, total=total, items=items)
  _cache[cache_key] = out
  return out
