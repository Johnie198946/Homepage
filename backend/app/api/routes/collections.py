import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db
from app.core.config import settings
from app.models.collection import Collection
from app.models.photo import Photo
from app.schemas.collections import CollectionCreate, CollectionOut, CollectionUpdate
from app.services.audit import write_audit_log
from app.services.storage import get_s3_client


logger = logging.getLogger(__name__)
router = APIRouter(prefix='/collections')


def _collection_to_out(collection: Collection, photo_count: int) -> CollectionOut:
  return CollectionOut(
    id=collection.id,
    location_en=collection.location_en,
    location_zh=collection.location_zh,
    description_en=collection.description_en,
    description_zh=collection.description_zh,
    category=collection.category,
    photo_count=photo_count,
    sort_order=collection.sort_order,
    created_at=collection.created_at,
    updated_at=collection.updated_at,
  )


@router.get('', response_model=list[CollectionOut])
def list_collections(db: Session = Depends(get_db)):
  rows = (
    db.query(Collection, func.count(Photo.id))
    .outerjoin(Photo, Photo.collection_id == Collection.id)
    .group_by(Collection.id)
    .order_by(Collection.sort_order.asc(), Collection.created_at.asc())
    .all()
  )
  return [_collection_to_out(collection, int(count)) for collection, count in rows]


@router.get('/{collection_id}', response_model=CollectionOut)
def get_collection(collection_id: int, db: Session = Depends(get_db)):
  row = (
    db.query(Collection, func.count(Photo.id))
    .outerjoin(Photo, Photo.collection_id == Collection.id)
    .filter(Collection.id == collection_id)
    .group_by(Collection.id)
    .first()
  )
  if not row:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Collection not found')
  collection, count = row
  return _collection_to_out(collection, int(count))


@router.post('', response_model=CollectionOut)
def create_collection(
  payload: CollectionCreate,
  request: Request,
  admin=Depends(get_current_admin),
  db: Session = Depends(get_db),
):
  exists = db.query(Collection).filter(Collection.location_en == payload.location_en).first()
  if exists:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Location already exists')

  collection = Collection(**payload.model_dump())
  db.add(collection)
  db.commit()
  db.refresh(collection)

  write_audit_log(
    db=db,
    request=request,
    action='collections.create',
    target_type='collection',
    target_id=str(collection.id),
  )
  return _collection_to_out(collection, 0)


@router.put('/{collection_id}', response_model=CollectionOut)
def update_collection(
  collection_id: int,
  payload: CollectionUpdate,
  request: Request,
  admin=Depends(get_current_admin),
  db: Session = Depends(get_db),
):
  collection = db.query(Collection).filter(Collection.id == collection_id).first()
  if not collection:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Collection not found')

  data = payload.model_dump(exclude_unset=True)
  if 'location_en' in data:
    exists = (
      db.query(Collection)
      .filter(Collection.location_en == data['location_en'], Collection.id != collection_id)
      .first()
    )
    if exists:
      raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Location already exists')

  for key, value in data.items():
    setattr(collection, key, value)

  db.add(collection)
  db.commit()
  db.refresh(collection)

  count = db.query(func.count(Photo.id)).filter(Photo.collection_id == collection.id).scalar() or 0
  write_audit_log(
    db=db,
    request=request,
    action='collections.update',
    target_type='collection',
    target_id=str(collection.id),
  )
  return _collection_to_out(collection, int(count))


@router.delete('/{collection_id}')
def delete_collection(
  collection_id: int,
  request: Request,
  admin=Depends(get_current_admin),
  db: Session = Depends(get_db),
):
  collection = db.query(Collection).filter(Collection.id == collection_id).first()
  if not collection:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Collection not found')

  photos = db.query(Photo).filter(Photo.collection_id == collection_id).all()
  keys = [photo.image_key for photo in photos]
  keys.extend(photo.thumb_key for photo in photos if photo.thumb_key)

  try:
    for photo in photos:
      db.delete(photo)
    db.delete(collection)
    db.commit()
  except Exception as exc:
    db.rollback()
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Delete failed') from exc

  try:
    client = get_s3_client()
    for key in keys:
      client.delete_object(Bucket=settings.s3_bucket, Key=key)
  except Exception:
    logger.exception(
      'Failed to delete collection media from object storage',
      extra={'collection_id': collection_id, 'keys': keys},
    )

  write_audit_log(
    db=db,
    request=request,
    action='collections.delete',
    target_type='collection',
    target_id=str(collection_id),
  )
  return Response(status_code=status.HTTP_204_NO_CONTENT)
