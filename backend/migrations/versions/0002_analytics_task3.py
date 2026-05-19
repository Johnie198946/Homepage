"""analytics task3

Revision ID: 0002_analytics_task3
Revises: 0001_init
Create Date: 2026-05-18
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "0002_analytics_task3"
down_revision = "0001_init"
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.alter_column(
    "analytics_events",
    "target_id",
    existing_type=sa.String(length=128),
    type_=sa.String(length=255),
    existing_nullable=False,
    existing_server_default="",
  )
  op.add_column(
    "analytics_events",
    sa.Column("referer", sa.Text(), nullable=False, server_default=""),
  )
  op.create_index("ix_analytics_events_target_id", "analytics_events", ["target_id"], unique=False)
  op.create_check_constraint(
    "ck_analytics_events_event_type",
    "analytics_events",
    "event_type IN ('page_view', 'button_click', 'photo_view')",
  )
  op.execute(
    """
    DO $$
    DECLARE
      partition_name TEXT;
    BEGIN
      FOR partition_name IN
        SELECT child.relname
        FROM pg_inherits
        JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
        JOIN pg_class child ON pg_inherits.inhrelid = child.oid
        WHERE parent.relname = 'analytics_events'
      LOOP
        EXECUTE format(
          'CREATE INDEX IF NOT EXISTS %I ON %I (event_type)',
          'ix_' || partition_name || '_event_type',
          partition_name
        );
        EXECUTE format(
          'CREATE INDEX IF NOT EXISTS %I ON %I (created_at)',
          'ix_' || partition_name || '_created_at',
          partition_name
        );
        EXECUTE format(
          'CREATE INDEX IF NOT EXISTS %I ON %I (target_id)',
          'ix_' || partition_name || '_target_id',
          partition_name
        );
      END LOOP;
    END $$;
    """
  )


def downgrade() -> None:
  op.execute(
    """
    DO $$
    DECLARE
      partition_name TEXT;
    BEGIN
      FOR partition_name IN
        SELECT child.relname
        FROM pg_inherits
        JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
        JOIN pg_class child ON pg_inherits.inhrelid = child.oid
        WHERE parent.relname = 'analytics_events'
      LOOP
        EXECUTE format('DROP INDEX IF EXISTS %I', 'ix_' || partition_name || '_target_id');
        EXECUTE format('DROP INDEX IF EXISTS %I', 'ix_' || partition_name || '_created_at');
        EXECUTE format('DROP INDEX IF EXISTS %I', 'ix_' || partition_name || '_event_type');
      END LOOP;
    END $$;
    """
  )
  op.drop_constraint("ck_analytics_events_event_type", "analytics_events", type_="check")
  op.drop_index("ix_analytics_events_target_id", table_name="analytics_events")
  op.drop_column("analytics_events", "referer")
  op.alter_column(
    "analytics_events",
    "target_id",
    existing_type=sa.String(length=255),
    type_=sa.String(length=128),
    existing_nullable=False,
    existing_server_default="",
  )
