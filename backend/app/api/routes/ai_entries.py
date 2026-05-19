from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db
from app.models.ai_entry import AiEntry
from app.schemas.ai_entries import AiEntryCreate, AiEntryOut, AiEntryUpdate
from app.services.audit import write_audit_log


router = APIRouter(prefix='/ai-entries')


def _entry_to_out(entry: AiEntry, lang: str = 'en') -> AiEntryOut:
  if lang.lower().startswith('zh'):
    title = entry.title_zh or entry.title_en
    description = entry.description_zh or entry.description_en
  else:
    title = entry.title_en or entry.title_zh
    description = entry.description_en or entry.description_zh

  return AiEntryOut(
    id=entry.id,
    title=title,
    description=description,
    title_en=entry.title_en,
    title_zh=entry.title_zh,
    description_en=entry.description_en,
    description_zh=entry.description_zh,
    url=entry.url,
    is_active=entry.is_active,
    sort_order=entry.sort_order,
    created_at=entry.created_at,
    updated_at=entry.updated_at,
  )


@router.get('', response_model=list[AiEntryOut])
def list_public(lang: str = 'en', db: Session = Depends(get_db)):
  items = (
    db.query(AiEntry)
    .filter(AiEntry.is_active.is_(True))
    .order_by(AiEntry.sort_order.asc(), AiEntry.created_at.asc())
    .all()
  )
  return [_entry_to_out(item, lang) for item in items]


@router.get('/all', response_model=list[AiEntryOut])
def list_all(lang: str = 'en', admin=Depends(get_current_admin), db: Session = Depends(get_db)):
  items = db.query(AiEntry).order_by(AiEntry.sort_order.asc(), AiEntry.created_at.asc()).all()
  return [_entry_to_out(item, lang) for item in items]


@router.post('', response_model=AiEntryOut)
def create_entry(
  payload: AiEntryCreate,
  request: Request,
  admin=Depends(get_current_admin),
  db: Session = Depends(get_db),
):
  entry = AiEntry(**payload.model_dump())
  db.add(entry)
  db.commit()
  db.refresh(entry)

  write_audit_log(db=db, request=request, action='ai_entries.create', target_type='ai_entry', target_id=str(entry.id))
  return _entry_to_out(entry)


@router.put('/{entry_id}', response_model=AiEntryOut)
def update_entry(
  entry_id: int,
  payload: AiEntryUpdate,
  request: Request,
  admin=Depends(get_current_admin),
  db: Session = Depends(get_db),
):
  entry = db.query(AiEntry).filter(AiEntry.id == entry_id).first()
  if not entry:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='AI entry not found')

  data = payload.model_dump(exclude_unset=True)
  for key, value in data.items():
    setattr(entry, key, value)

  db.add(entry)
  db.commit()
  db.refresh(entry)

  write_audit_log(db=db, request=request, action='ai_entries.update', target_type='ai_entry', target_id=str(entry.id))
  return _entry_to_out(entry)


@router.delete('/{entry_id}')
def delete_entry(
  entry_id: int,
  request: Request,
  admin=Depends(get_current_admin),
  db: Session = Depends(get_db),
):
  entry = db.query(AiEntry).filter(AiEntry.id == entry_id).first()
  if not entry:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='AI entry not found')

  db.delete(entry)
  db.commit()

  write_audit_log(db=db, request=request, action='ai_entries.delete', target_type='ai_entry', target_id=str(entry_id))
  return Response(status_code=status.HTTP_204_NO_CONTENT)
