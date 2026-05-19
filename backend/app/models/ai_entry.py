from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AiEntry(Base):
  __tablename__ = 'ai_entries'

  id: Mapped[int] = mapped_column(Integer, primary_key=True)
  title_en: Mapped[str] = mapped_column(String(100), nullable=False, server_default='')
  title_zh: Mapped[str] = mapped_column(String(100), nullable=False, server_default='')
  description_en: Mapped[str] = mapped_column(String(500), nullable=False, server_default='')
  description_zh: Mapped[str] = mapped_column(String(500), nullable=False, server_default='')
  url: Mapped[str] = mapped_column(String(2048), nullable=False)

  is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default='true')
  sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default='100', index=True)

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
