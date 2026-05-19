import logging
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db
from app.core.config import settings
from app.models.home_video import HomeVideo
from app.schemas.videos import VideoOut, VideoUpdate
from app.services.audit import write_audit_log
from app.services.file_validation import (
  FileValidationError,
  MAX_VIDEO_SIZE,
  normalize_video_playback_mime_type,
  validate_video_upload,
)
from app.services.storage import build_object_url, ensure_bucket_exists, get_s3_client, presign_get_object
from app.services.video_processing import generate_homepage_video_variant, optimize_video_for_web


logger = logging.getLogger(__name__)
router = APIRouter(prefix='/videos')
PUBLIC_VIDEO_LIMIT = 3


def _video_to_out(video: HomeVideo) -> VideoOut:
  return VideoOut(
    id=video.id,
    title=video.title,
    url=f'/api/videos/{video.id}/play',
    mime_type=normalize_video_playback_mime_type(video.mime_type),
    file_size=video.file_size,
    homepage_url=f'/api/videos/{video.id}/play?variant=homepage' if video.homepage_s3_key else None,
    homepage_mime_type=normalize_video_playback_mime_type(video.homepage_mime_type) if video.homepage_mime_type else None,
    homepage_file_size=video.homepage_file_size,
    is_active=video.is_active,
    sort_order=video.sort_order,
    created_at=video.created_at,
  )


def _read_video_upload(file: UploadFile) -> tuple[bytes, int, bytes]:
  chunks: list[bytes] = []
  size = 0
  head = b''

  while True:
    chunk = file.file.read(1024 * 1024)
    if not chunk:
      break
    if len(head) < 64:
      head = (head + chunk)[:64]
    size += len(chunk)
    if size > MAX_VIDEO_SIZE:
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Video file exceeds 500MB limit')
    chunks.append(chunk)

  if size == 0:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Empty upload is not allowed')

  return b''.join(chunks), size, head


@router.get('', response_model=list[VideoOut])
def list_public(db: Session = Depends(get_db)):
  items = (
    db.query(HomeVideo)
    .filter(HomeVideo.is_active.is_(True))
    .order_by(HomeVideo.sort_order.asc(), HomeVideo.created_at.asc())
    .limit(PUBLIC_VIDEO_LIMIT)
    .all()
  )
  return [_video_to_out(v) for v in items]


@router.get('/all', response_model=list[VideoOut])
def list_all(admin=Depends(get_current_admin), db: Session = Depends(get_db)):
  items = db.query(HomeVideo).order_by(HomeVideo.sort_order.asc(), HomeVideo.created_at.asc()).all()
  return [_video_to_out(v) for v in items]


@router.get('/{video_id}/play')
def play(video_id: int, variant: str | None = None, db: Session = Depends(get_db)):
  video = db.query(HomeVideo).filter(HomeVideo.id == video_id).first()
  if not video or not video.is_active:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Video not found')

  key = video.homepage_s3_key if variant == 'homepage' and video.homepage_s3_key else video.s3_key
  presigned = presign_get_object(key=key, expires_in=3600)
  return RedirectResponse(url=presigned.url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.post('', response_model=VideoOut)
def create_video(
  request: Request,
  file: UploadFile = File(...),
  title: str = Form(''),
  sort_order: int = Form(100),
  is_active: bool = Form(True),
  admin=Depends(get_current_admin),
  db: Session = Depends(get_db),
):
  if not 1 <= sort_order <= 9999:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='sort_order must be between 1 and 9999')

  data, size, head = _read_video_upload(file)

  try:
    content_type = validate_video_upload(head, size=size, declared_content_type=file.content_type)
  except FileValidationError as exc:
    raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

  data = optimize_video_for_web(data, content_type=content_type)
  size = len(data)
  homepage_variant = generate_homepage_video_variant(data, content_type=content_type)

  key = f'videos/{uuid.uuid4().hex}'
  homepage_key = f'videos/homepage/{uuid.uuid4().hex}.mp4' if homepage_variant else None
  ensure_bucket_exists()
  client = get_s3_client()

  try:
    client.put_object(Bucket=settings.s3_bucket, Key=key, Body=data, ContentType=content_type)
    if homepage_variant and homepage_key:
      client.put_object(
        Bucket=settings.s3_bucket,
        Key=homepage_key,
        Body=homepage_variant.data,
        ContentType=homepage_variant.content_type,
      )
  except Exception as exc:
    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail='Upload failed') from exc

  video = HomeVideo(
    title=title or file.filename or 'Video',
    s3_key=key,
    homepage_s3_key=homepage_key,
    source_url=build_object_url(key=key),
    mime_type=content_type,
    file_size=size,
    homepage_mime_type=homepage_variant.content_type if homepage_variant else None,
    homepage_file_size=len(homepage_variant.data) if homepage_variant else None,
    sort_order=sort_order,
    is_active=is_active,
  )
  db.add(video)

  try:
    db.commit()
  except Exception as exc:
    db.rollback()
    try:
      client.delete_object(Bucket=settings.s3_bucket, Key=key)
      if homepage_key:
        client.delete_object(Bucket=settings.s3_bucket, Key=homepage_key)
    except Exception:
      logger.exception('Failed to cleanup orphaned video upload', extra={'key': key})
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Create failed') from exc

  db.refresh(video)
  write_audit_log(db=db, request=request, action='videos.create', target_type='video', target_id=str(video.id))
  return _video_to_out(video)


@router.put('/{video_id}', response_model=VideoOut)
def update_video(
  video_id: int,
  payload: VideoUpdate,
  request: Request,
  admin=Depends(get_current_admin),
  db: Session = Depends(get_db),
):
  video = db.query(HomeVideo).filter(HomeVideo.id == video_id).first()
  if not video:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Video not found')

  data = payload.model_dump(exclude_unset=True)
  for key, value in data.items():
    setattr(video, key, value)

  db.add(video)
  db.commit()
  db.refresh(video)

  write_audit_log(db=db, request=request, action='videos.update', target_type='video', target_id=str(video.id))
  return _video_to_out(video)


@router.patch('/{video_id}/status', response_model=VideoOut)
def update_status(
  video_id: int,
  request: Request,
  is_active: bool,
  admin=Depends(get_current_admin),
  db: Session = Depends(get_db),
):
  video = db.query(HomeVideo).filter(HomeVideo.id == video_id).first()
  if not video:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Video not found')

  video.is_active = is_active
  db.add(video)
  db.commit()
  db.refresh(video)

  write_audit_log(db=db, request=request, action='videos.status', target_type='video', target_id=str(video.id))
  return _video_to_out(video)


@router.delete('/{video_id}')
def delete_video(
  video_id: int,
  request: Request,
  admin=Depends(get_current_admin),
  db: Session = Depends(get_db),
):
  video = db.query(HomeVideo).filter(HomeVideo.id == video_id).first()
  if not video:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Video not found')

  s3_key = video.s3_key
  homepage_s3_key = video.homepage_s3_key
  db.delete(video)
  db.commit()

  try:
    client = get_s3_client()
    client.delete_object(Bucket=settings.s3_bucket, Key=s3_key)
    if homepage_s3_key:
      client.delete_object(Bucket=settings.s3_bucket, Key=homepage_s3_key)
  except Exception:
    logger.exception('Failed to delete video from object storage', extra={'key': s3_key, 'video_id': video_id})

  write_audit_log(db=db, request=request, action='videos.delete', target_type='video', target_id=str(video_id))
  return Response(status_code=status.HTTP_204_NO_CONTENT)
