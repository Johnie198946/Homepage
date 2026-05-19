from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Collection(Base):
  __tablename__ = 'collections'

  id: Mapped[int] = mapped_column(Integer, primary_key=True)
  location_en: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
  location_zh: Mapped[str | None] = mapped_column(String(100), nullable=True)
  description_en: Mapped[str] = mapped_column(Text, nullable=False, server_default='')
  description_zh: Mapped[str] = mapped_column(Text, nullable=False, server_default='')
  category: Mapped[str] = mapped_column(String(50), nullable=False, server_default='')
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

  photos = relationship('Photo', back_populates='collection', cascade='all, delete-orphan')
