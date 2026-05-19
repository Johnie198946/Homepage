"""init

Revision ID: 0001_init
Revises: None
Create Date: 2026-05-18
"""

from __future__ import annotations

from datetime import UTC, datetime

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None


def _month_start(dt: datetime) -> datetime:
  return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _add_month(dt: datetime) -> datetime:
  year = dt.year + (dt.month // 12)
  month = (dt.month % 12) + 1
  return dt.replace(year=year, month=month, day=1)


def upgrade() -> None:
  op.create_table(
    "admin_users",
    sa.Column("id", sa.Integer(), primary_key=True),
    sa.Column("username", sa.String(length=50), nullable=False),
    sa.Column("email", sa.String(length=320), nullable=True),
    sa.Column("password_hash", sa.String(length=255), nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
  )
  op.create_index("ix_admin_users_username", "admin_users", ["username"], unique=True)
  op.create_index("ix_admin_users_email", "admin_users", ["email"], unique=True)

  op.create_table(
    "jwt_blacklist",
    sa.Column("id", sa.Integer(), primary_key=True),
    sa.Column("jti", sa.String(length=64), nullable=False),
    sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
  )
  op.create_index("ix_jwt_blacklist_jti", "jwt_blacklist", ["jti"], unique=True)
  op.create_index("ix_jwt_blacklist_expires_at", "jwt_blacklist", ["expires_at"], unique=False)

  op.create_table(
    "home_videos",
    sa.Column("id", sa.Integer(), primary_key=True),
    sa.Column("title", sa.String(length=255), nullable=False),
    sa.Column("s3_key", sa.String(length=1024), nullable=False),
    sa.Column("poster_key", sa.String(length=1024), nullable=True),
    sa.Column("is_active", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
  )
  op.create_index("ix_home_videos_sort_order", "home_videos", ["sort_order"], unique=False)

  op.create_table(
    "collections",
    sa.Column("id", sa.Integer(), primary_key=True),
    sa.Column("location_en", sa.String(length=255), nullable=False),
    sa.Column("location_zh", sa.String(length=255), nullable=True),
    sa.Column("description_en", sa.Text(), server_default="", nullable=False),
    sa.Column("description_zh", sa.Text(), server_default="", nullable=False),
    sa.Column("category", sa.String(length=128), server_default="", nullable=False),
    sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
  )
  op.create_index("ix_collections_location_en", "collections", ["location_en"], unique=True)
  op.create_index("ix_collections_sort_order", "collections", ["sort_order"], unique=False)

  op.create_table(
    "photos",
    sa.Column("id", sa.Integer(), primary_key=True),
    sa.Column("collection_id", sa.Integer(), sa.ForeignKey("collections.id", ondelete="CASCADE"), nullable=False),
    sa.Column("title_en", sa.String(length=255), server_default="", nullable=False),
    sa.Column("title_zh", sa.String(length=255), server_default="", nullable=False),
    sa.Column("description_en", sa.Text(), server_default="", nullable=False),
    sa.Column("description_zh", sa.Text(), server_default="", nullable=False),
    sa.Column("details_en", sa.Text(), server_default="", nullable=False),
    sa.Column("details_zh", sa.Text(), server_default="", nullable=False),
    sa.Column("image_key", sa.String(length=1024), nullable=False),
    sa.Column("thumb_key", sa.String(length=1024), nullable=True),
    sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
  )
  op.create_index("ix_photos_collection_id", "photos", ["collection_id"], unique=False)
  op.create_index("ix_photos_sort_order", "photos", ["sort_order"], unique=False)

  op.create_table(
    "about_content",
    sa.Column("id", sa.Integer(), primary_key=True),
    sa.Column("intro_en", sa.Text(), server_default="", nullable=False),
    sa.Column("intro_zh", sa.Text(), server_default="", nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
  )

  op.create_table(
    "ai_entries",
    sa.Column("id", sa.Integer(), primary_key=True),
    sa.Column("title_en", sa.String(length=255), server_default="", nullable=False),
    sa.Column("title_zh", sa.String(length=255), server_default="", nullable=False),
    sa.Column("description_en", sa.Text(), server_default="", nullable=False),
    sa.Column("description_zh", sa.Text(), server_default="", nullable=False),
    sa.Column("url", sa.String(length=2048), nullable=False),
    sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
  )
  op.create_index("ix_ai_entries_sort_order", "ai_entries", ["sort_order"], unique=False)

  op.create_table(
    "audit_logs",
    sa.Column("id", sa.Integer(), primary_key=True),
    sa.Column("actor_admin_id", sa.Integer(), nullable=False),
    sa.Column("action", sa.String(length=128), nullable=False),
    sa.Column("target_type", sa.String(length=64), server_default="", nullable=False),
    sa.Column("target_id", sa.String(length=128), server_default="", nullable=False),
    sa.Column("ip", sa.String(length=64), server_default="", nullable=False),
    sa.Column("user_agent", sa.String(length=512), server_default="", nullable=False),
    sa.Column("detail", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
  )
  op.create_index("ix_audit_logs_actor_admin_id", "audit_logs", ["actor_admin_id"], unique=False)
  op.create_index("ix_audit_logs_action", "audit_logs", ["action"], unique=False)
  op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"], unique=False)

  op.execute(
    """
    CREATE TABLE analytics_events (
      id BIGSERIAL NOT NULL,
      event_type VARCHAR(64) NOT NULL,
      page VARCHAR(512) NOT NULL DEFAULT '',
      target_type VARCHAR(64) NOT NULL DEFAULT '',
      target_id VARCHAR(128) NOT NULL DEFAULT '',
      meta JSONB NOT NULL DEFAULT '{}'::jsonb,
      ip_hash VARCHAR(128) NOT NULL DEFAULT '',
      user_agent VARCHAR(512) NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (id, created_at)
    ) PARTITION BY RANGE (created_at);
    """
  )
  op.create_index("ix_analytics_events_event_type", "analytics_events", ["event_type"], unique=False)
  op.create_index("ix_analytics_events_created_at", "analytics_events", ["created_at"], unique=False)

  now = datetime.now(UTC)
  this_month = _month_start(now)
  next_month = _add_month(this_month)
  next_next_month = _add_month(next_month)

  p1 = f"analytics_events_{this_month.strftime('%Y%m')}"
  p2 = f"analytics_events_{next_month.strftime('%Y%m')}"
  p1_start = this_month.isoformat()
  p1_end = next_month.isoformat()
  p2_start = next_month.isoformat()
  p2_end = next_next_month.isoformat()

  op.execute(
    f"""
    CREATE TABLE {p1}
    PARTITION OF analytics_events
    FOR VALUES FROM ('{p1_start}') TO ('{p1_end}');
    """
  )
  op.execute(
    f"""
    CREATE TABLE {p2}
    PARTITION OF analytics_events
    FOR VALUES FROM ('{p2_start}') TO ('{p2_end}');
    """
  )


def downgrade() -> None:
  op.execute("DROP TABLE IF EXISTS analytics_events CASCADE;")
  op.drop_table("audit_logs")
  op.drop_table("ai_entries")
  op.drop_table("about_content")
  op.drop_table("photos")
  op.drop_table("collections")
  op.drop_table("home_videos")
  op.drop_table("jwt_blacklist")
  op.drop_table("admin_users")
