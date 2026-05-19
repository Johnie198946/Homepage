"""add homepage optimized video variant fields

Revision ID: 0006_home_vid_variant
Revises: 0005_internal_inbox_read_status
Create Date: 2026-05-19
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "0006_home_vid_variant"
down_revision = "0005_internal_inbox_read_status"
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.add_column(
    "home_videos",
    sa.Column("homepage_s3_key", sa.String(length=1024), nullable=True),
  )
  op.add_column(
    "home_videos",
    sa.Column("homepage_mime_type", sa.String(length=50), nullable=True),
  )
  op.add_column(
    "home_videos",
    sa.Column("homepage_file_size", sa.Integer(), nullable=True),
  )
  op.create_unique_constraint(
    "uq_home_videos_homepage_s3_key",
    "home_videos",
    ["homepage_s3_key"],
  )


def downgrade() -> None:
  op.drop_constraint("uq_home_videos_homepage_s3_key", "home_videos", type_="unique")
  op.drop_column("home_videos", "homepage_file_size")
  op.drop_column("home_videos", "homepage_mime_type")
  op.drop_column("home_videos", "homepage_s3_key")
