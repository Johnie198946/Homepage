import json
import logging
import uuid
from datetime import UTC, datetime
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, Response, UploadFile, status
from fastapi.responses import RedirectResponse
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db
from app.core.config import settings
from app.models.collection import Collection
from app.models.photo import Photo
from app.schemas.photos import (
  CopyrightOut,
  PhotoBatchDelete,
  PhotoBatchUploadItem,
  PhotoBatchUploadFailure,
  PhotoBatchUploadOut,
  PhotoBatchUpdate,
  PhotoCreate,
  PhotoOut,
  PhotoUpdate,
  PresignedUrls,
)
from app.services.audit import write_audit_log
from app.services.file_validation import FileValidationError, validate_image_upload
from app.services.storage import build_object_url, ensure_bucket_exists, get_s3_client, presign_get_object
from app.services.thumbnails import generate_thumbnail_1600w


logger = logging.getLogger(__name__)
router = APIRouter(prefix='/photos')


def _allowed_referers() -> list[str]:
  return settings.media_referer_allowlist_list


def _normalize_allowlist_entry(entry: str) -> set[str]:
  value = entry.strip().rstrip('/').lower()
  if not value:
    return set()

  parsed = urlparse(value)
  candidates = {value}
  if parsed.scheme and parsed.netloc:
    candidates.add(f'{parsed.scheme}://{parsed.netloc}')
  if parsed.netloc:
    candidates.add(parsed.netloc)
  if parsed.hostname:
    candidates.add(parsed.hostname)
  return candidates


def _referer_candidates(value: str) -> set[str]:
  referer = value.strip().rstrip('/').lower()
  if not referer:
    return set()

  parsed = urlparse(referer)
  candidates = {referer}
  if parsed.scheme and parsed.netloc:
    candidates.add(f'{parsed.scheme}://{parsed.netloc}')
  if parsed.netloc:
    candidates.add(parsed.netloc)
  if parsed.hostname:
    candidates.add(parsed.hostname)
  return candidates


def _check_referer(request: Request):
  allow = {
    candidate
    for entry in _allowed_referers()
    for candidate in _normalize_allowlist_entry(entry)
  }
  if not allow:
    return

  referer = request.headers.get('referer') or request.headers.get('origin') or ''
  candidates = _referer_candidates(referer)
  if not candidates:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Forbidden')
  if allow.isdisjoint(candidates):
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Forbidden')


def _copyright(photo: Photo) -> CopyrightOut:
  return CopyrightOut(photographer=photo.copyright_name, year=photo.copyright_year)


def _photo_to_out(photo: Photo) -> PhotoOut:
  return PhotoOut(
    id=photo.id,
    collection_id=photo.collection_id,
    title_en=photo.title_en,
    title_zh=photo.title_zh,
    description_en=photo.description_en,
    description_zh=photo.description_zh,
    details_en=photo.details_en,
    details_zh=photo.details_zh,
    location=photo.location,
    category=photo.category,
    image_url=f'/api/photos/{photo.id}/media',
    thumb_url=f'/api/photos/{photo.id}/media?variant=thumb' if photo.thumb_key else None,
    mime_type=photo.mime_type,
    file_size=photo.file_size,
    width=photo.width,
    height=photo.height,
    sort_order=photo.sort_order,
    copyright=_copyright(photo),
    created_at=photo.created_at,
    updated_at=photo.updated_at,
  )


def _parse_photo_create(**kwargs) -> PhotoCreate:
  try:
    return PhotoCreate.model_validate(kwargs)
  except ValidationError as exc:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.errors()) from exc


def _detail_to_text(detail: object) -> str:
  if isinstance(detail, str) and detail.strip():
    return detail
  if isinstance(detail, list) and detail:
    first = detail[0]
    if isinstance(first, dict):
      msg = first.get('msg')
      if isinstance(msg, str) and msg.strip():
        return msg
    return str(first)
  return 'Upload failed'


def _upload_photo_file(*, file: UploadFile, payload: PhotoCreate, db: Session) -> Photo:
  collection = db.query(Collection).filter(Collection.id == payload.collection_id).first()
  if not collection:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid collection_id')

  file.file.seek(0)
  data = file.file.read()
  if not data:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Empty upload is not allowed')

  try:
    inspected = validate_image_upload(data, declared_content_type=file.content_type)
  except FileValidationError as exc:
    raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

  upload_bytes = inspected.normalized_data

  image_key = f'photos/{uuid.uuid4().hex}'
  image_url = build_object_url(key=image_key)
  thumb_key = None
  thumb_url = None
  ensure_bucket_exists()
  client = get_s3_client()

  try:
    client.put_object(
      Bucket=settings.s3_bucket,
      Key=image_key,
      Body=upload_bytes,
      ContentType=inspected.content_type,
    )
  except Exception as exc:
    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail='Upload failed') from exc

  try:
    thumb = generate_thumbnail_1600w(upload_bytes)
    thumb_key = f'photos/thumbs/{uuid.uuid4().hex}.jpg'
    thumb_url = build_object_url(key=thumb_key)
    client.put_object(Bucket=settings.s3_bucket, Key=thumb_key, Body=thumb, ContentType='image/jpeg')
  except Exception:
    thumb_key = None
    thumb_url = None
    logger.exception('Failed to generate or upload thumbnail', extra={'image_key': image_key})

  photo = Photo(
    collection_id=payload.collection_id,
    title_en=payload.title_en,
    title_zh=payload.title_zh,
    description_en=payload.description_en,
    description_zh=payload.description_zh,
    details_en=payload.details_en,
    details_zh=payload.details_zh,
    location=payload.location or collection.location_en,
    category=payload.category or collection.category,
    image_key=image_key,
    image_url=image_url,
    thumb_key=thumb_key,
    thumb_url=thumb_url,
    width=inspected.width,
    height=inspected.height,
    mime_type=inspected.content_type,
    file_size=inspected.size,
    copyright_name=payload.copyright_name,
    copyright_year=payload.copyright_year or datetime.now(UTC).year,
    sort_order=payload.sort_order,
  )
  db.add(photo)

  try:
    db.commit()
  except Exception as exc:
    db.rollback()
    try:
      client.delete_object(Bucket=settings.s3_bucket, Key=image_key)
      if thumb_key:
        client.delete_object(Bucket=settings.s3_bucket, Key=thumb_key)
    except Exception:
      logger.exception('Failed to cleanup orphaned photo upload', extra={'image_key': image_key, 'thumb_key': thumb_key})
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Create failed') from exc

  db.refresh(photo)
  return photo


def _parse_batch_items(raw: str | None, expected_length: int) -> list[PhotoBatchUploadItem]:
  if not raw:
    return [PhotoBatchUploadItem() for _ in range(expected_length)]

  try:
    parsed = json.loads(raw)
  except json.JSONDecodeError as exc:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid batch metadata payload') from exc

  if not isinstance(parsed, list):
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Batch metadata must be a list')
  if len(parsed) != expected_length:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Batch metadata count does not match file count')

  try:
    return [PhotoBatchUploadItem.model_validate(item) for item in parsed]
  except ValidationError as exc:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.errors()) from exc


@router.get('', response_model=list[PhotoOut])
def list_photos(
  location: str | None = None,
  category: str | None = None,
  collection_id: int | None = None,
  page: int = Query(default=1, ge=1),
  page_size: int = Query(default=20, ge=1, le=100),
  db: Session = Depends(get_db),
):
  query = db.query(Photo)
  if location:
    query = query.filter(Photo.location == location)
  if category:
    query = query.filter(Photo.category == category)
  if collection_id is not None:
    query = query.filter(Photo.collection_id == collection_id)

  items = (
    query.order_by(Photo.collection_id.asc(), Photo.sort_order.asc(), Photo.created_at.asc())
    .offset((page - 1) * page_size)
    .limit(page_size)
    .all()
  )
  return [_photo_to_out(photo) for photo in items]


@router.get('/{photo_id}', response_model=PhotoOut)
def get_photo(photo_id: int, db: Session = Depends(get_db)):
  photo = db.query(Photo).filter(Photo.id == photo_id).first()
  if not photo:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Photo not found')
  return _photo_to_out(photo)


@router.get('/{photo_id}/presigned', response_model=PresignedUrls)
def get_presigned(photo_id: int, db: Session = Depends(get_db)):
  photo = db.query(Photo).filter(Photo.id == photo_id).first()
  if not photo:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Photo not found')

  image = presign_get_object(key=photo.image_key, expires_in=3600)
  thumb_url = None
  if photo.thumb_key:
    thumb_url = presign_get_object(key=photo.thumb_key, expires_in=3600).url

  return PresignedUrls(
    presigned_url=image.url,
    thumb_presigned_url=thumb_url,
    expires_in=image.expires_in,
    expires_at=image.expires_at,
    copyright=_copyright(photo),
  )


@router.get('/{photo_id}/media')
def get_media(photo_id: int, request: Request, variant: str = 'image', db: Session = Depends(get_db)):
  _check_referer(request)

  photo = db.query(Photo).filter(Photo.id == photo_id).first()
  if not photo:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Photo not found')

  key = photo.image_key
  if variant == 'thumb' and photo.thumb_key:
    key = photo.thumb_key

  presigned = presign_get_object(key=key, expires_in=3600)
  return RedirectResponse(url=presigned.url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.post('', response_model=PhotoOut)
def create_photo(
  request: Request,
  file: UploadFile = File(...),
  collection_id: int = Form(...),
  title_en: str = Form(''),
  title_zh: str = Form(''),
  description_en: str = Form(''),
  description_zh: str = Form(''),
  details_en: str = Form(''),
  details_zh: str = Form(''),
  location: str | None = Form(None),
  category: str | None = Form(None),
  copyright_name: str = Form('Johnie Photography'),
  copyright_year: int | None = Form(None),
  sort_order: int = Form(100),
  admin=Depends(get_current_admin),
  db: Session = Depends(get_db),
):
  payload = _parse_photo_create(
    collection_id=collection_id,
    title_en=title_en,
    title_zh=title_zh,
    description_en=description_en,
    description_zh=description_zh,
    details_en=details_en,
    details_zh=details_zh,
    location=location,
    category=category,
    copyright_name=copyright_name,
    copyright_year=copyright_year,
    sort_order=sort_order,
  )
  photo = _upload_photo_file(file=file, payload=payload, db=db)
  write_audit_log(db=db, request=request, action='photos.create', target_type='photo', target_id=str(photo.id))
  return _photo_to_out(photo)


@router.post('/batch', response_model=PhotoBatchUploadOut)
def batch_create_photos(
  request: Request,
  files: list[UploadFile] = File(...),
  collection_id: int = Form(...),
  location: str | None = Form(None),
  category: str | None = Form(None),
  copyright_name: str = Form('Johnie Photography'),
  copyright_year: int | None = Form(None),
  sort_order_start: int = Form(100),
  sort_order_step: int = Form(10),
  items: str | None = Form(None),
  admin=Depends(get_current_admin),
  db: Session = Depends(get_db),
):
  del admin
  if not files:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='At least one file is required')

  batch_items = _parse_batch_items(items, len(files))
  created: list[PhotoOut] = []
  failed: list[PhotoBatchUploadFailure] = []

  for index, file in enumerate(files):
    item = batch_items[index]
    fallback_title = file.filename.rsplit('.', 1)[0] if file.filename else f'photo-{index + 1}'
    payload = _parse_photo_create(
      collection_id=collection_id,
      title_en=item.title_en or fallback_title,
      title_zh=item.title_zh or fallback_title,
      description_en=item.description_en,
      description_zh=item.description_zh,
      details_en=item.details_en,
      details_zh=item.details_zh,
      location=location,
      category=category,
      copyright_name=copyright_name,
      copyright_year=copyright_year,
      sort_order=item.sort_order if item.sort_order is not None else sort_order_start + (index * sort_order_step),
    )

    try:
      photo = _upload_photo_file(file=file, payload=payload, db=db)
      created.append(_photo_to_out(photo))
      write_audit_log(db=db, request=request, action='photos.create', target_type='photo', target_id=str(photo.id))
    except HTTPException as exc:
      failed.append(
        PhotoBatchUploadFailure(
          index=index,
          file_name=file.filename or f'photo-{index + 1}',
          error=_detail_to_text(exc.detail),
        )
      )

  write_audit_log(db=db, request=request, action='photos.batch_create', target_type='photo', target_id='')
  return PhotoBatchUploadOut(created=created, failed=failed)


@router.put('/{photo_id}', response_model=PhotoOut)
def update_photo(
  photo_id: int,
  payload: PhotoUpdate,
  request: Request,
  admin=Depends(get_current_admin),
  db: Session = Depends(get_db),
):
  photo = db.query(Photo).filter(Photo.id == photo_id).first()
  if not photo:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Photo not found')

  data = payload.model_dump(exclude_unset=True)
  if 'collection_id' in data:
    collection = db.query(Collection).filter(Collection.id == data['collection_id']).first()
    if not collection:
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid collection_id')
    photo.collection_id = collection.id
  else:
    collection = db.query(Collection).filter(Collection.id == photo.collection_id).first()

  for key, value in data.items():
    if key == 'collection_id':
      continue
    setattr(photo, key, value)

  if 'location' not in data and not photo.location and collection is not None:
    photo.location = collection.location_en
  if 'category' not in data and not photo.category and collection is not None:
    photo.category = collection.category

  db.add(photo)
  db.commit()
  db.refresh(photo)

  write_audit_log(db=db, request=request, action='photos.update', target_type='photo', target_id=str(photo.id))
  return _photo_to_out(photo)


@router.delete('/{photo_id}')
def delete_photo(
  photo_id: int,
  request: Request,
  admin=Depends(get_current_admin),
  db: Session = Depends(get_db),
):
  photo = db.query(Photo).filter(Photo.id == photo_id).first()
  if not photo:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Photo not found')

  keys = [photo.image_key]
  if photo.thumb_key:
    keys.append(photo.thumb_key)

  db.delete(photo)
  db.commit()

  try:
    client = get_s3_client()
    for key in keys:
      client.delete_object(Bucket=settings.s3_bucket, Key=key)
  except Exception:
    logger.exception('Failed to delete photo media from object storage', extra={'photo_id': photo_id, 'keys': keys})

  write_audit_log(db=db, request=request, action='photos.delete', target_type='photo', target_id=str(photo_id))
  return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post('/batch-delete')
def batch_delete(
  payload: PhotoBatchDelete,
  request: Request,
  admin=Depends(get_current_admin),
  db: Session = Depends(get_db),
):
  photos = db.query(Photo).filter(Photo.id.in_(payload.ids)).all()
  keys = [photo.image_key for photo in photos]
  keys.extend(photo.thumb_key for photo in photos if photo.thumb_key)

  try:
    for photo in photos:
      db.delete(photo)
    db.commit()
  except Exception as exc:
    db.rollback()
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Batch delete failed') from exc

  try:
    client = get_s3_client()
    for key in keys:
      client.delete_object(Bucket=settings.s3_bucket, Key=key)
  except Exception:
    logger.exception('Failed to delete batch photo media from object storage', extra={'keys': keys})

  write_audit_log(db=db, request=request, action='photos.batch_delete', target_type='photo', target_id='')
  return {'deleted': len(photos)}


@router.patch('/batch-update')
def batch_update(
  payload: PhotoBatchUpdate,
  request: Request,
  admin=Depends(get_current_admin),
  db: Session = Depends(get_db),
):
  collection = None
  if payload.collection_id is not None:
    collection = db.query(Collection).filter(Collection.id == payload.collection_id).first()
    if not collection:
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid collection_id')

  try:
    for photo_id in payload.ids:
      photo = db.query(Photo).filter(Photo.id == photo_id).first()
      if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f'Photo {photo_id} not found')
      if payload.collection_id is not None:
        photo.collection_id = payload.collection_id
      if payload.location is not None:
        photo.location = payload.location
      if payload.category is not None:
        photo.category = payload.category
      if payload.copyright_name is not None:
        photo.copyright_name = payload.copyright_name
      if payload.copyright_year is not None:
        photo.copyright_year = payload.copyright_year
      if collection is not None:
        if payload.location is None and not photo.location:
          photo.location = collection.location_en
        if payload.category is None and not photo.category:
          photo.category = collection.category
      db.add(photo)
    db.commit()
  except HTTPException:
    db.rollback()
    raise
  except Exception as exc:
    db.rollback()
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Batch update failed') from exc

  write_audit_log(db=db, request=request, action='photos.batch_update', target_type='photo', target_id='')
  return {'updated': len(payload.ids)}
