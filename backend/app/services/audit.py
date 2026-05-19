from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import Request
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)


def write_audit_log(
  *,
  db: Session,
  request: Request,
  action: str,
  target_type: str = "",
  target_id: str = "",
  detail: dict | None = None,
):
  admin_id = getattr(request.state, "admin_id", None)
  if not isinstance(admin_id, int):
    return

  ip = request.client.host if request.client else ""
  user_agent = request.headers.get("user-agent", "")

  try:
    db.add(
      AuditLog(
        actor_admin_id=admin_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        ip=ip,
        user_agent=user_agent,
        detail=detail or {},
      )
    )
    db.commit()
  except Exception:
    db.rollback()


def purge_expired_audit_logs(*, db: Session, retention_days: int) -> int:
  cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)

  try:
    result = db.execute(delete(AuditLog).where(AuditLog.created_at < cutoff))
    db.commit()
  except Exception:
    db.rollback()
    raise

  return result.rowcount or 0
