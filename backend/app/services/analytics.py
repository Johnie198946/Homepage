from __future__ import annotations

import logging
from datetime import UTC, datetime
from threading import Lock

from sqlalchemy import text
from sqlalchemy.orm import Session


logger = logging.getLogger(__name__)

_partition_lock = Lock()


def normalize_event_timestamp(value: datetime | None) -> datetime:
  if value is None:
    return datetime.now(UTC)
  if value.tzinfo is None:
    return value.replace(tzinfo=UTC)
  return value.astimezone(UTC)


def _month_start(value: datetime) -> datetime:
  value = normalize_event_timestamp(value)
  return datetime(value.year, value.month, 1, tzinfo=UTC)


def _next_month(value: datetime) -> datetime:
  if value.month == 12:
    return datetime(value.year + 1, 1, 1, tzinfo=UTC)
  return datetime(value.year, value.month + 1, 1, tzinfo=UTC)


def _partition_name(value: datetime) -> str:
  return f"analytics_events_{value.strftime('%Y%m')}"


def ensure_month_partition(db: Session, value: datetime) -> str:
  month_start = _month_start(value)
  next_month = _next_month(month_start)
  partition_name = _partition_name(month_start)
  start_value = month_start.isoformat()
  end_value = next_month.isoformat()

  with _partition_lock:
    db.execute(
      text(
        f"""
        CREATE TABLE IF NOT EXISTS {partition_name}
        PARTITION OF analytics_events
        FOR VALUES FROM ('{start_value}') TO ('{end_value}');
        """
      )
    )
    for suffix, column in (
      ("event_type", "event_type"),
      ("created_at", "created_at"),
      ("target_id", "target_id"),
    ):
      db.execute(
        text(
          f"CREATE INDEX IF NOT EXISTS ix_{partition_name}_{suffix} "
          f"ON {partition_name} ({column});"
        )
      )

  return partition_name


def ensure_required_analytics_partitions(
  db: Session,
  reference_time: datetime | None = None,
  months_ahead: int = 1,
) -> list[str]:
  created: list[str] = []
  cursor = _month_start(reference_time or datetime.now(UTC))
  for _ in range(months_ahead + 1):
    created.append(ensure_month_partition(db, cursor))
    cursor = _next_month(cursor)
  return created
