from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db
from app.models.about_content import AboutContent
from app.schemas.about import AboutOut, AboutUpdate
from app.services.audit import write_audit_log


router = APIRouter(prefix='/about')


def _serialize_about(content: AboutContent | None, lang: str) -> AboutOut:
  resolved_lang = 'zh' if lang.lower().startswith('zh') else 'en'
  if content is None:
    return AboutOut(
      lang=resolved_lang,
      intro='',
      locations=[],
      contact={},
      intro_en='',
      intro_zh='',
      locations_en=[],
      locations_zh=[],
      portrait_url=None,
      updated_at=None,
    )

  intro = content.intro_zh if resolved_lang == 'zh' else content.intro_en
  locations = content.locations_zh if resolved_lang == 'zh' else content.locations_en
  return AboutOut(
    lang=resolved_lang,
    intro=intro,
    locations=locations,
    contact=content.contact or {},
    intro_en=content.intro_en,
    intro_zh=content.intro_zh,
    locations_en=content.locations_en or [],
    locations_zh=content.locations_zh or [],
    portrait_url=content.portrait_url,
    updated_at=content.updated_at,
  )


@router.get('', response_model=AboutOut)
def get_about(lang: str = 'en', db: Session = Depends(get_db)):
  content = db.query(AboutContent).order_by(AboutContent.id.asc()).first()
  return _serialize_about(content, lang)


@router.put('', response_model=AboutOut)
def update_about(
  payload: AboutUpdate,
  request: Request,
  admin=Depends(get_current_admin),
  db: Session = Depends(get_db),
):
  content = db.query(AboutContent).order_by(AboutContent.id.asc()).first()
  if not content:
    content = AboutContent(**payload.model_dump())
    db.add(content)
  else:
    for key, value in payload.model_dump().items():
      setattr(content, key, value)
    db.add(content)

  try:
    db.commit()
  except Exception as exc:
    db.rollback()
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Update failed') from exc

  db.refresh(content)
  write_audit_log(db=db, request=request, action='about.update', target_type='about', target_id=str(content.id))
  return _serialize_about(content, 'en')
