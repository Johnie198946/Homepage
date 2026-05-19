from datetime import datetime

from sqlalchemy import JSON, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AboutContent(Base):
  __tablename__ = 'about_content'

  id: Mapped[int] = mapped_column(Integer, primary_key=True)
  intro_en: Mapped[str] = mapped_column(Text, nullable=False, server_default='')
  intro_zh: Mapped[str] = mapped_column(Text, nullable=False, server_default='')
  locations_en: Mapped[list[str]] = mapped_column(JSON, nullable=False, server_default='[]')
  locations_zh: Mapped[list[str]] = mapped_column(JSON, nullable=False, server_default='[]')
  contact: Mapped[dict[str, str]] = mapped_column(JSON, nullable=False, server_default='{}')
  portrait_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)

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
