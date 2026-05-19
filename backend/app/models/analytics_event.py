from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AnalyticsEvent(Base):
  __tablename__ = "analytics_events"

  id: Mapped[int] = mapped_column(Integer, primary_key=True)
  event_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
  page: Mapped[str] = mapped_column(String(512), nullable=False, server_default="")
  target_type: Mapped[str] = mapped_column(String(64), nullable=False, server_default="")
  target_id: Mapped[str] = mapped_column(String(255), nullable=False, server_default="")
  meta: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default="{}")
  ip_hash: Mapped[str] = mapped_column(String(128), nullable=False, server_default="")
  referer: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
  user_agent: Mapped[str] = mapped_column(Text, nullable=False, server_default="")

  created_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    primary_key=True,
    nullable=False,
    server_default=func.now(),
    index=True,
  )
