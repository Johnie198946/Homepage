from datetime import datetime
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator


class AiEntryOut(BaseModel):
  id: int
  title: str
  description: str
  title_en: str
  title_zh: str
  description_en: str
  description_zh: str
  url: str
  is_active: bool
  sort_order: int
  created_at: datetime
  updated_at: datetime


class AiEntryCreate(BaseModel):
  title_en: str = Field(default='', max_length=100)
  title_zh: str = Field(default='', max_length=100)
  description_en: str = Field(default='', max_length=500)
  description_zh: str = Field(default='', max_length=500)
  url: str
  is_active: bool = True
  sort_order: int = Field(default=100, ge=1, le=9999)

  @field_validator('url')
  @classmethod
  def validate_https(cls, value: str) -> str:
    if len(value) > 2048:
      raise ValueError('URL too long')
    parsed = urlparse(value)
    if parsed.scheme != 'https' or not parsed.netloc:
      raise ValueError('URL must start with https://')
    return value


class AiEntryUpdate(BaseModel):
  title_en: str | None = Field(default=None, max_length=100)
  title_zh: str | None = Field(default=None, max_length=100)
  description_en: str | None = Field(default=None, max_length=500)
  description_zh: str | None = Field(default=None, max_length=500)
  url: str | None = None
  is_active: bool | None = None
  sort_order: int | None = Field(default=None, ge=1, le=9999)

  @field_validator('url')
  @classmethod
  def validate_https(cls, value: str | None) -> str | None:
    if value is None:
      return None
    if len(value) > 2048:
      raise ValueError('URL too long')
    parsed = urlparse(value)
    if parsed.scheme != 'https' or not parsed.netloc:
      raise ValueError('URL must start with https://')
    return value
