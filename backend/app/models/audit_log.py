from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AuditLog(Base):
  __tablename__ = "audit_logs"

  id: Mapped[int] = mapped_column(Integer, primary_key=True)
  actor_admin_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
  action: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
  target_type: Mapped[str] = mapped_column(String(64), nullable=False, server_default="")
  target_id: Mapped[str] = mapped_column(String(128), nullable=False, server_default="")
  ip: Mapped[str] = mapped_column(String(64), nullable=False, server_default="")
  user_agent: Mapped[str] = mapped_column(String(512), nullable=False, server_default="")
  detail: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default="{}")

  created_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    nullable=False,
    server_default=func.now(),
    index=True,
  )

