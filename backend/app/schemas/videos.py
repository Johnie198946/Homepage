from datetime import datetime

from pydantic import BaseModel, Field


class VideoOut(BaseModel):
  id: int
  title: str
  url: str
  mime_type: str
  file_size: int
  homepage_url: str | None = None
  homepage_mime_type: str | None = None
  homepage_file_size: int | None = None
  is_active: bool
  sort_order: int
  created_at: datetime


class VideoUpdate(BaseModel):
  title: str | None = Field(default=None, max_length=100)
  is_active: bool | None = None
  sort_order: int | None = Field(default=None, ge=1, le=9999)
