"""add editable home text content

Revision ID: 0007_home_text_content
Revises: 0006_home_vid_variant
Create Date: 2026-05-19
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "0007_home_text_content"
down_revision = "0006_home_vid_variant"
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.add_column("about_content", sa.Column("home_title_en", sa.String(length=300), nullable=False, server_default=""))
  op.add_column("about_content", sa.Column("home_title_zh", sa.String(length=300), nullable=False, server_default=""))
  op.add_column("about_content", sa.Column("home_subtitle_en", sa.Text(), nullable=False, server_default=""))
  op.add_column("about_content", sa.Column("home_subtitle_zh", sa.Text(), nullable=False, server_default=""))
  op.add_column(
    "about_content",
    sa.Column("home_recent_works_label_en", sa.String(length=200), nullable=False, server_default=""),
  )
  op.add_column(
    "about_content",
    sa.Column("home_recent_works_label_zh", sa.String(length=200), nullable=False, server_default=""),
  )
  op.add_column(
    "about_content",
    sa.Column("home_explore_by_location_label_en", sa.String(length=200), nullable=False, server_default=""),
  )
  op.add_column(
    "about_content",
    sa.Column("home_explore_by_location_label_zh", sa.String(length=200), nullable=False, server_default=""),
  )
  op.add_column("about_content", sa.Column("home_empty_video_en", sa.String(length=300), nullable=False, server_default=""))
  op.add_column("about_content", sa.Column("home_empty_video_zh", sa.String(length=300), nullable=False, server_default=""))
  op.add_column(
    "about_content",
    sa.Column("home_empty_recent_works_en", sa.String(length=300), nullable=False, server_default=""),
  )
  op.add_column(
    "about_content",
    sa.Column("home_empty_recent_works_zh", sa.String(length=300), nullable=False, server_default=""),
  )
  op.add_column(
    "about_content",
    sa.Column("home_empty_locations_en", sa.String(length=300), nullable=False, server_default=""),
  )
  op.add_column(
    "about_content",
    sa.Column("home_empty_locations_zh", sa.String(length=300), nullable=False, server_default=""),
  )
  op.add_column("about_content", sa.Column("home_loading_label_en", sa.String(length=100), nullable=False, server_default=""))
  op.add_column("about_content", sa.Column("home_loading_label_zh", sa.String(length=100), nullable=False, server_default=""))


def downgrade() -> None:
  op.drop_column("about_content", "home_loading_label_zh")
  op.drop_column("about_content", "home_loading_label_en")
  op.drop_column("about_content", "home_empty_locations_zh")
  op.drop_column("about_content", "home_empty_locations_en")
  op.drop_column("about_content", "home_empty_recent_works_zh")
  op.drop_column("about_content", "home_empty_recent_works_en")
  op.drop_column("about_content", "home_empty_video_zh")
  op.drop_column("about_content", "home_empty_video_en")
  op.drop_column("about_content", "home_explore_by_location_label_zh")
  op.drop_column("about_content", "home_explore_by_location_label_en")
  op.drop_column("about_content", "home_recent_works_label_zh")
  op.drop_column("about_content", "home_recent_works_label_en")
  op.drop_column("about_content", "home_subtitle_zh")
  op.drop_column("about_content", "home_subtitle_en")
  op.drop_column("about_content", "home_title_zh")
  op.drop_column("about_content", "home_title_en")
