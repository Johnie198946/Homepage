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
      home_title='',
      home_subtitle='',
      home_recent_works_label='',
      home_explore_by_location_label='',
      home_empty_video='',
      home_empty_recent_works='',
      home_empty_locations='',
      home_loading_label='',
      home_title_en='',
      home_title_zh='',
      home_subtitle_en='',
      home_subtitle_zh='',
      home_recent_works_label_en='',
      home_recent_works_label_zh='',
      home_explore_by_location_label_en='',
      home_explore_by_location_label_zh='',
      home_empty_video_en='',
      home_empty_video_zh='',
      home_empty_recent_works_en='',
      home_empty_recent_works_zh='',
      home_empty_locations_en='',
      home_empty_locations_zh='',
      home_loading_label_en='',
      home_loading_label_zh='',
      locations_en=[],
      locations_zh=[],
      portrait_url=None,
      updated_at=None,
    )

  intro = content.intro_zh if resolved_lang == 'zh' else content.intro_en
  locations = content.locations_zh if resolved_lang == 'zh' else content.locations_en
  home_title = content.home_title_zh if resolved_lang == 'zh' else content.home_title_en
  home_subtitle = content.home_subtitle_zh if resolved_lang == 'zh' else content.home_subtitle_en
  home_recent_works_label = (
    content.home_recent_works_label_zh if resolved_lang == 'zh' else content.home_recent_works_label_en
  )
  home_explore_by_location_label = (
    content.home_explore_by_location_label_zh
    if resolved_lang == 'zh'
    else content.home_explore_by_location_label_en
  )
  home_empty_video = content.home_empty_video_zh if resolved_lang == 'zh' else content.home_empty_video_en
  home_empty_recent_works = (
    content.home_empty_recent_works_zh if resolved_lang == 'zh' else content.home_empty_recent_works_en
  )
  home_empty_locations = content.home_empty_locations_zh if resolved_lang == 'zh' else content.home_empty_locations_en
  home_loading_label = content.home_loading_label_zh if resolved_lang == 'zh' else content.home_loading_label_en
  return AboutOut(
    lang=resolved_lang,
    intro=intro,
    locations=locations,
    contact=content.contact or {},
    intro_en=content.intro_en,
    intro_zh=content.intro_zh,
    home_title=home_title,
    home_subtitle=home_subtitle,
    home_recent_works_label=home_recent_works_label,
    home_explore_by_location_label=home_explore_by_location_label,
    home_empty_video=home_empty_video,
    home_empty_recent_works=home_empty_recent_works,
    home_empty_locations=home_empty_locations,
    home_loading_label=home_loading_label,
    home_title_en=content.home_title_en,
    home_title_zh=content.home_title_zh,
    home_subtitle_en=content.home_subtitle_en,
    home_subtitle_zh=content.home_subtitle_zh,
    home_recent_works_label_en=content.home_recent_works_label_en,
    home_recent_works_label_zh=content.home_recent_works_label_zh,
    home_explore_by_location_label_en=content.home_explore_by_location_label_en,
    home_explore_by_location_label_zh=content.home_explore_by_location_label_zh,
    home_empty_video_en=content.home_empty_video_en,
    home_empty_video_zh=content.home_empty_video_zh,
    home_empty_recent_works_en=content.home_empty_recent_works_en,
    home_empty_recent_works_zh=content.home_empty_recent_works_zh,
    home_empty_locations_en=content.home_empty_locations_en,
    home_empty_locations_zh=content.home_empty_locations_zh,
    home_loading_label_en=content.home_loading_label_en,
    home_loading_label_zh=content.home_loading_label_zh,
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
