"""task14 business inquiries

Revision ID: 0004_task14_business_inquiries
Revises: 0003_merge_heads
Create Date: 2026-05-19
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "0004_task14_business_inquiries"
down_revision = "0003_merge_heads"
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.create_table(
    "business_inquiries",
    sa.Column("id", sa.Integer(), primary_key=True),
    sa.Column("name", sa.String(length=100), nullable=False),
    sa.Column("email", sa.String(length=320), nullable=False),
    sa.Column("company", sa.String(length=200), server_default="", nullable=False),
    sa.Column("message", sa.Text(), nullable=False),
    sa.Column("source_page", sa.String(length=255), server_default="/about", nullable=False),
    sa.Column("status", sa.String(length=32), server_default="new", nullable=False),
    sa.Column(
      "owner_notification_status",
      sa.String(length=32),
      server_default="pending",
      nullable=False,
    ),
    sa.Column(
      "visitor_receipt_status",
      sa.String(length=32),
      server_default="pending",
      nullable=False,
    ),
    sa.Column("owner_notification_error", sa.Text(), nullable=True),
    sa.Column("visitor_receipt_error", sa.Text(), nullable=True),
    sa.Column("owner_notified_at", sa.DateTime(timezone=True), nullable=True),
    sa.Column("visitor_receipt_sent_at", sa.DateTime(timezone=True), nullable=True),
    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
  )
  op.create_index(
    "ix_business_inquiries_email",
    "business_inquiries",
    ["email"],
    unique=False,
  )
  op.create_index(
    "ix_business_inquiries_status",
    "business_inquiries",
    ["status"],
    unique=False,
  )
  op.create_check_constraint(
    "ck_business_inquiries_status",
    "business_inquiries",
    "status in ('new', 'in_progress', 'resolved')",
  )
  op.create_check_constraint(
    "ck_business_inquiries_owner_notification_status",
    "business_inquiries",
    "owner_notification_status in ('pending', 'sent', 'failed')",
  )
  op.create_check_constraint(
    "ck_business_inquiries_visitor_receipt_status",
    "business_inquiries",
    "visitor_receipt_status in ('pending', 'sent', 'failed')",
  )


def downgrade() -> None:
  op.drop_constraint("ck_business_inquiries_visitor_receipt_status", "business_inquiries")
  op.drop_constraint("ck_business_inquiries_owner_notification_status", "business_inquiries")
  op.drop_constraint("ck_business_inquiries_status", "business_inquiries")
  op.drop_index("ix_business_inquiries_status", table_name="business_inquiries")
  op.drop_index("ix_business_inquiries_email", table_name="business_inquiries")
  op.drop_table("business_inquiries")
