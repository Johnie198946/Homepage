from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class CopyrightOut(BaseModel):
  photographer: str
  year: int


class PhotoOut(BaseModel):
  id: int
  collection_id: int
  title_en: str
  title_zh: str
  description_en: str
  description_zh: str
  details_en: str
  details_zh: str
  location: str
  category: str
  image_url: str
  thumb_url: str | None = None
  mime_type: str
  file_size: int
  width: int | None = None
  height: int | None = None
  sort_order: int
  copyright: CopyrightOut
  created_at: datetime
  updated_at: datetime


class PhotoCreate(BaseModel):
  collection_id: int
  title_en: str = Field(default='', max_length=100)
  title_zh: str = Field(default='', max_length=100)
  description_en: str = Field(default='', max_length=1000)
  description_zh: str = Field(default='', max_length=1000)
  details_en: str = ''
  details_zh: str = ''
  location: str | None = Field(default=None, max_length=200)
  category: str | None = Field(default=None, max_length=50)
  copyright_name: str = Field(default='Johnie Photography', min_length=1, max_length=100)
  copyright_year: int | None = Field(default=None, ge=1900, le=2100)
  sort_order: int = Field(default=100, ge=1, le=9999)


class PhotoUpdate(BaseModel):
  collection_id: int | None = None
  title_en: str | None = Field(default=None, max_length=100)
  title_zh: str | None = Field(default=None, max_length=100)
  description_en: str | None = Field(default=None, max_length=1000)
  description_zh: str | None = Field(default=None, max_length=1000)
  details_en: str | None = None
  details_zh: str | None = None
  location: str | None = Field(default=None, max_length=200)
  category: str | None = Field(default=None, max_length=50)
  copyright_name: str | None = Field(default=None, min_length=1, max_length=100)
  copyright_year: int | None = Field(default=None, ge=1900, le=2100)
  sort_order: int | None = Field(default=None, ge=1, le=9999)


class PhotoBatchDelete(BaseModel):
  ids: list[int] = Field(min_length=1, max_length=100)


class PhotoBatchUploadItem(BaseModel):
  title_en: str = Field(default='', max_length=100)
  title_zh: str = Field(default='', max_length=100)
  description_en: str = Field(default='', max_length=1000)
  description_zh: str = Field(default='', max_length=1000)
  details_en: str = ''
  details_zh: str = ''
  sort_order: int | None = Field(default=None, ge=1, le=9999)


class PhotoBatchUploadFailure(BaseModel):
  index: int
  file_name: str
  error: str


class PhotoBatchUploadOut(BaseModel):
  created: list[PhotoOut]
  failed: list[PhotoBatchUploadFailure]


class PhotoBatchUpdate(BaseModel):
  ids: list[int] = Field(min_length=1, max_length=100)
  collection_id: int | None = None
  location: str | None = Field(default=None, max_length=200)
  category: str | None = Field(default=None, max_length=50)
  copyright_name: str | None = Field(default=None, min_length=1, max_length=100)
  copyright_year: int | None = Field(default=None, ge=1900, le=2100)

  @model_validator(mode='after')
  def validate_patch(self):
    if (
      self.collection_id is None
      and self.location is None
      and self.category is None
      and self.copyright_name is None
      and self.copyright_year is None
    ):
      raise ValueError('At least one batch update field is required')
    return self


class PresignedUrls(BaseModel):
  presigned_url: str
  thumb_presigned_url: str | None = None
  expires_in: int
  expires_at: datetime
  copyright: CopyrightOut
