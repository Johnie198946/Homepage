from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class AboutOut(BaseModel):
  lang: str
  intro: str
  locations: list[str]
  contact: dict[str, str]
  intro_en: str
  intro_zh: str
  locations_en: list[str]
  locations_zh: list[str]
  portrait_url: str | None = None
  updated_at: datetime | None = None


class AboutUpdate(BaseModel):
  intro_en: str = Field(min_length=1, max_length=2000)
  intro_zh: str = Field(min_length=1, max_length=2000)
  locations_en: list[str] = Field(default_factory=list)
  locations_zh: list[str] = Field(default_factory=list)
  contact: dict[str, str] = Field(default_factory=dict)
  portrait_url: str | None = Field(default=None, max_length=2048)

  @field_validator('locations_en', 'locations_zh')
  @classmethod
  def validate_locations(cls, value: list[str]) -> list[str]:
    cleaned = [item.strip() for item in value if item and item.strip()]
    for item in cleaned:
      if len(item) > 100:
        raise ValueError('Location item must be at most 100 characters')
    return cleaned

  @field_validator('contact')
  @classmethod
  def validate_contact(cls, value: dict[str, str]) -> dict[str, str]:
    cleaned: dict[str, str] = {}
    for key, item in value.items():
      key = key.strip()
      if not key:
        raise ValueError('Contact key cannot be empty')
      text = str(item).strip()
      if len(key) > 100:
        raise ValueError('Contact key must be at most 100 characters')
      if len(text) > 500:
        raise ValueError('Contact value must be at most 500 characters')
      cleaned[key] = text
    return cleaned
