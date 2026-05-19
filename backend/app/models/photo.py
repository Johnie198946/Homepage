from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, SmallInteger, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Photo(Base):
  __tablename__ = 'photos'

  id: Mapped[int] = mapped_column(Integer, primary_key=True)
  collection_id: Mapped[int] = mapped_column(
    Integer,
    ForeignKey('collections.id', ondelete='CASCADE'),
    nullable=False,
    index=True,
  )

  title_en: Mapped[str] = mapped_column(String(100), nullable=False, server_default='')
  title_zh: Mapped[str] = mapped_column(String(100), nullable=False, server_default='')
  description_en: Mapped[str] = mapped_column(Text, nullable=False, server_default='')
  description_zh: Mapped[str] = mapped_column(Text, nullable=False, server_default='')
  details_en: Mapped[str] = mapped_column(Text, nullable=False, server_default='')
  details_zh: Mapped[str] = mapped_column(Text, nullable=False, server_default='')
  location: Mapped[str] = mapped_column(String(200), nullable=False, server_default='')
  category: Mapped[str] = mapped_column(String(50), nullable=False, server_default='')

  image_key: Mapped[str] = mapped_column(String(1024), nullable=False, unique=True)
  image_url: Mapped[str] = mapped_column(String(2048), nullable=False)
  thumb_key: Mapped[str | None] = mapped_column(String(1024), nullable=True)
  thumb_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
  width: Mapped[int | None] = mapped_column(Integer, nullable=True)
  height: Mapped[int | None] = mapped_column(Integer, nullable=True)
  mime_type: Mapped[str] = mapped_column(String(50), nullable=False)
  file_size: Mapped[int] = mapped_column(Integer, nullable=False)
  copyright_name: Mapped[str] = mapped_column(String(100), nullable=False, server_default='Johnie Photography')
  copyright_year: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default=func.extract('year', func.now()))

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

  collection = relationship('Collection', back_populates='photos')
