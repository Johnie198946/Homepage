"""switch business inquiries to internal inbox read status

Revision ID: 0005_internal_inbox_read_status
Revises: 0004_task14_business_inquiries
Create Date: 2026-05-19
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "0005_internal_inbox_read_status"
down_revision = "0004_task14_business_inquiries"
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.add_column(
    "business_inquiries",
    sa.Column("read_status", sa.String(length=32), server_default="unread", nullable=False),
  )
  op.add_column(
    "business_inquiries",
    sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
  )
  op.create_index(
    "ix_business_inquiries_read_status",
    "business_inquiries",
    ["read_status"],
    unique=False,
  )
  op.create_check_constraint(
    "ck_business_inquiries_read_status",
    "business_inquiries",
    "read_status in ('unread', 'read')",
  )

  op.alter_column(
    "business_inquiries",
    "owner_notification_status",
    existing_type=sa.String(length=32),
    server_default="disabled",
    existing_nullable=False,
  )
  op.alter_column(
    "business_inquiries",
    "visitor_receipt_status",
    existing_type=sa.String(length=32),
    server_default="disabled",
    existing_nullable=False,
  )

  op.execute(
    """
    UPDATE business_inquiries
    SET read_status = 'unread'
    WHERE read_status IS NULL
    """
  )
  op.execute(
    """
    UPDATE business_inquiries
    SET owner_notification_status = 'disabled'
    WHERE owner_notification_status = 'pending'
    """
  )
  op.execute(
    """
    UPDATE business_inquiries
    SET visitor_receipt_status = 'disabled'
    WHERE visitor_receipt_status = 'pending'
    """
  )

  op.drop_constraint("ck_business_inquiries_owner_notification_status", "business_inquiries")
  op.drop_constraint("ck_business_inquiries_visitor_receipt_status", "business_inquiries")
  op.create_check_constraint(
    "ck_business_inquiries_owner_notification_status",
    "business_inquiries",
    "owner_notification_status in ('disabled', 'pending', 'sent', 'failed')",
  )
  op.create_check_constraint(
    "ck_business_inquiries_visitor_receipt_status",
    "business_inquiries",
    "visitor_receipt_status in ('disabled', 'pending', 'sent', 'failed')",
  )


def downgrade() -> None:
  op.drop_constraint("ck_business_inquiries_visitor_receipt_status", "business_inquiries")
  op.drop_constraint("ck_business_inquiries_owner_notification_status", "business_inquiries")
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

  op.execute(
    """
    UPDATE business_inquiries
    SET owner_notification_status = 'pending'
    WHERE owner_notification_status = 'disabled'
    """
  )
  op.execute(
    """
    UPDATE business_inquiries
    SET visitor_receipt_status = 'pending'
    WHERE visitor_receipt_status = 'disabled'
    """
  )
  op.alter_column(
    "business_inquiries",
    "owner_notification_status",
    existing_type=sa.String(length=32),
    server_default="pending",
    existing_nullable=False,
  )
  op.alter_column(
    "business_inquiries",
    "visitor_receipt_status",
    existing_type=sa.String(length=32),
    server_default="pending",
    existing_nullable=False,
  )

  op.drop_constraint("ck_business_inquiries_read_status", "business_inquiries")
  op.drop_index("ix_business_inquiries_read_status", table_name="business_inquiries")
  op.drop_column("business_inquiries", "read_at")
  op.drop_column("business_inquiries", "read_status")
