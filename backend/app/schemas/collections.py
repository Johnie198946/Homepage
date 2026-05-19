from datetime import datetime

from pydantic import BaseModel, Field


class CollectionOut(BaseModel):
  id: int
  location_en: str
  location_zh: str | None = None
  description_en: str
  description_zh: str
  category: str
  photo_count: int
  sort_order: int
  created_at: datetime
  updated_at: datetime


class CollectionCreate(BaseModel):
  location_en: str = Field(min_length=1, max_length=100)
  location_zh: str = Field(min_length=1, max_length=100)
  description_en: str = Field(default='', max_length=500)
  description_zh: str = Field(default='', max_length=500)
  category: str = Field(default='', max_length=50)
  sort_order: int = Field(default=100, ge=1, le=9999)


class CollectionUpdate(BaseModel):
  location_en: str | None = Field(default=None, min_length=1, max_length=100)
  location_zh: str | None = Field(default=None, min_length=1, max_length=100)
  description_en: str | None = Field(default=None, max_length=500)
  description_zh: str | None = Field(default=None, max_length=500)
  category: str | None = Field(default=None, max_length=50)
  sort_order: int | None = Field(default=None, ge=1, le=9999)
