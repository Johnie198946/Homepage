from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class BusinessInquiry(Base):
  __tablename__ = 'business_inquiries'

  id: Mapped[int] = mapped_column(Integer, primary_key=True)
  name: Mapped[str] = mapped_column(String(100), nullable=False)
  email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
  company: Mapped[str] = mapped_column(String(200), nullable=False, server_default='')
  message: Mapped[str] = mapped_column(Text, nullable=False)
  source_page: Mapped[str] = mapped_column(String(255), nullable=False, server_default='/about')
  status: Mapped[str] = mapped_column(String(32), nullable=False, server_default='new', index=True)
  read_status: Mapped[str] = mapped_column(String(32), nullable=False, server_default='unread', index=True)
  owner_notification_status: Mapped[str] = mapped_column(String(32), nullable=False, server_default='disabled')
  visitor_receipt_status: Mapped[str] = mapped_column(String(32), nullable=False, server_default='disabled')
  owner_notification_error: Mapped[str | None] = mapped_column(Text, nullable=True)
  visitor_receipt_error: Mapped[str | None] = mapped_column(Text, nullable=True)
  read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
  owner_notified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
  visitor_receipt_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
  created_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    nullable=False,
    server_default=func.now(),
  )
  updated_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    nullable=False,
    server_default=func.now(),
    onupdate=func.now(),
  )
