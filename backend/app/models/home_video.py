from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class HomeVideo(Base):
  __tablename__ = 'home_videos'

  id: Mapped[int] = mapped_column(Integer, primary_key=True)
  title: Mapped[str] = mapped_column(String(100), nullable=False)
  s3_key: Mapped[str] = mapped_column(String(1024), nullable=False, unique=True)
  homepage_s3_key: Mapped[str | None] = mapped_column(String(1024), nullable=True, unique=True)
  source_url: Mapped[str] = mapped_column(String(2048), nullable=False)
  mime_type: Mapped[str] = mapped_column(String(50), nullable=False)
  file_size: Mapped[int] = mapped_column(Integer, nullable=False)
  homepage_mime_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
  homepage_file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
  poster_key: Mapped[str | None] = mapped_column(String(1024), nullable=True)

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
