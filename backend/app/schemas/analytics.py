from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class AnalyticsEventIn(BaseModel):
  model_config = ConfigDict(populate_by_name=True, extra="ignore")

  event_type: str = Field(validation_alias=AliasChoices("event_type", "eventType"))
  page: str = Field(default="", max_length=512)
  target_type: str = Field(
    default="",
    max_length=64,
    validation_alias=AliasChoices("target_type", "targetType"),
  )
  target_id: str = Field(
    default="",
    max_length=255,
    validation_alias=AliasChoices("target_id", "targetId"),
  )
  timestamp: datetime | None = None
  meta: dict[str, Any] = Field(default_factory=dict)


class PageViewItem(BaseModel):
  page: str
  views: int


class PageViewsOut(BaseModel):
  range: str
  total: int
  items: list[PageViewItem]


class TopPhotoOut(BaseModel):
  photo_id: int
  views: int
  title_en: str = ""
  title_zh: str = ""
  media_url: str | None = None
  thumb_url: str | None = None


class ButtonClickItem(BaseModel):
  target_id: str
  clicks: int


class ButtonClicksOut(BaseModel):
  range: str
  total: int
  items: list[ButtonClickItem]
