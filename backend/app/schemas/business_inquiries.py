from datetime import datetime
from email.utils import parseaddr
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


InquiryStatus = Literal["new", "in_progress", "resolved"]
ReadStatus = Literal["unread", "read"]
NotificationStatus = Literal["disabled", "pending", "sent", "failed"]


class BusinessInquiryCreate(BaseModel):
  name: str = Field(min_length=1, max_length=100)
  email: str = Field(min_length=3, max_length=320)
  company: str = Field(default="", max_length=200)
  message: str = Field(min_length=1, max_length=5000)
  source_page: str = Field(default="/about", min_length=1, max_length=255)

  @field_validator("name", "email", "company", "message", "source_page", mode="after")
  @classmethod
  def strip_text(cls, value: str) -> str:
    return value.strip()

  @field_validator("name", "message", "source_page", mode="after")
  @classmethod
  def ensure_not_blank(cls, value: str) -> str:
    if not value:
      raise ValueError("Field cannot be blank")
    return value

  @field_validator("email", mode="after")
  @classmethod
  def validate_email(cls, value: str) -> str:
    _, address = parseaddr(value)
    if "@" not in address or address != value:
      raise ValueError("Invalid email address")
    return value


class BusinessInquiryStatusUpdate(BaseModel):
  status: InquiryStatus


class BusinessInquiryOut(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  id: int
  name: str
  email: str
  company: str
  message: str
  source_page: str
  status: InquiryStatus
  read_status: ReadStatus
  owner_notification_status: NotificationStatus
  visitor_receipt_status: NotificationStatus
  read_at: datetime | None
  owner_notification_error: str | None
  visitor_receipt_error: str | None
  owner_notified_at: datetime | None
  visitor_receipt_sent_at: datetime | None
  created_at: datetime
  updated_at: datetime


class BusinessInquirySubmitResponse(BaseModel):
  id: int
  status: InquiryStatus
  owner_notification_status: NotificationStatus
  visitor_receipt_status: NotificationStatus
  notification_failed: bool
  detail: str
  created_at: datetime
