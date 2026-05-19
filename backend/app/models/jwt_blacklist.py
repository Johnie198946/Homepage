from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class JwtBlacklist(Base):
  __tablename__ = "jwt_blacklist"

  id: Mapped[int] = mapped_column(Integer, primary_key=True)
  jti: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
  expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
  created_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    nullable=False,
    server_default=func.now(),
  )
