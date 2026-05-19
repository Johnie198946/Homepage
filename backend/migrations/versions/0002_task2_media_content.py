"""task2 media and content fields

Revision ID: 0002_task2_media_content
Revises: 0001_init
Create Date: 2026-05-18
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "0002_task2_media_content"
down_revision = "0001_init"
branch_labels = None
depends_on = None


def upgrade() -> None:
  op.add_column('home_videos', sa.Column('source_url', sa.String(length=2048), nullable=True))
  op.add_column('home_videos', sa.Column('mime_type', sa.String(length=50), nullable=True))
  op.add_column('home_videos', sa.Column('file_size', sa.Integer(), nullable=True, server_default='0'))
  op.alter_column('home_videos', 'title', type_=sa.String(length=100), existing_type=sa.String(length=255))
  op.alter_column('home_videos', 'sort_order', server_default='100', existing_type=sa.Integer())
  op.alter_column('home_videos', 'is_active', server_default=sa.text('true'), existing_type=sa.Boolean())
  op.execute("UPDATE home_videos SET source_url = '' WHERE source_url IS NULL")
  op.execute("UPDATE home_videos SET mime_type = 'video/mp4' WHERE mime_type IS NULL")
  op.alter_column('home_videos', 'source_url', nullable=False, existing_type=sa.String(length=2048))
  op.alter_column('home_videos', 'mime_type', nullable=False, existing_type=sa.String(length=50))
  op.alter_column('home_videos', 'file_size', nullable=False, existing_type=sa.Integer(), server_default=None)
  op.create_unique_constraint('uq_home_videos_s3_key', 'home_videos', ['s3_key'])

  op.alter_column('collections', 'location_en', type_=sa.String(length=100), existing_type=sa.String(length=255))
  op.alter_column('collections', 'location_zh', type_=sa.String(length=100), existing_type=sa.String(length=255))
  op.alter_column('collections', 'category', type_=sa.String(length=50), existing_type=sa.String(length=128))
  op.alter_column('collections', 'sort_order', server_default='100', existing_type=sa.Integer())

  op.add_column('photos', sa.Column('location', sa.String(length=200), nullable=True, server_default=''))
  op.add_column('photos', sa.Column('category', sa.String(length=50), nullable=True, server_default=''))
  op.add_column('photos', sa.Column('image_url', sa.String(length=2048), nullable=True))
  op.add_column('photos', sa.Column('thumb_url', sa.String(length=2048), nullable=True))
  op.add_column('photos', sa.Column('width', sa.Integer(), nullable=True))
  op.add_column('photos', sa.Column('height', sa.Integer(), nullable=True))
  op.add_column('photos', sa.Column('mime_type', sa.String(length=50), nullable=True, server_default='image/jpeg'))
  op.add_column('photos', sa.Column('file_size', sa.Integer(), nullable=True, server_default='0'))
  op.add_column('photos', sa.Column('copyright_name', sa.String(length=100), nullable=True, server_default='Johnie Photography'))
  op.add_column('photos', sa.Column('copyright_year', sa.SmallInteger(), nullable=True, server_default='2026'))
  op.execute(
    """
    UPDATE photos
    SET location = COALESCE(c.location_en, ''),
        category = COALESCE(c.category, ''),
        image_url = COALESCE(image_key, ''),
        mime_type = COALESCE(mime_type, 'image/jpeg'),
        file_size = COALESCE(file_size, 0),
        copyright_name = COALESCE(copyright_name, 'Johnie Photography'),
        copyright_year = COALESCE(copyright_year, 2026)
    FROM collections c
    WHERE c.id = photos.collection_id
    """
  )
  op.alter_column('photos', 'title_en', type_=sa.String(length=100), existing_type=sa.String(length=255))
  op.alter_column('photos', 'title_zh', type_=sa.String(length=100), existing_type=sa.String(length=255))
  op.alter_column('photos', 'location', nullable=False, existing_type=sa.String(length=200), server_default=None)
  op.alter_column('photos', 'category', nullable=False, existing_type=sa.String(length=50), server_default=None)
  op.alter_column('photos', 'image_url', nullable=False, existing_type=sa.String(length=2048))
  op.alter_column('photos', 'mime_type', nullable=False, existing_type=sa.String(length=50), server_default=None)
  op.alter_column('photos', 'file_size', nullable=False, existing_type=sa.Integer(), server_default=None)
  op.alter_column('photos', 'copyright_name', nullable=False, existing_type=sa.String(length=100), server_default=None)
  op.alter_column('photos', 'copyright_year', nullable=False, existing_type=sa.SmallInteger(), server_default=None)
  op.alter_column('photos', 'sort_order', server_default='100', existing_type=sa.Integer())
  op.create_unique_constraint('uq_photos_image_key', 'photos', ['image_key'])
  op.create_index('ix_photos_location', 'photos', ['location'], unique=False)
  op.create_index('ix_photos_category', 'photos', ['category'], unique=False)

  op.add_column('about_content', sa.Column('locations_en', sa.JSON(), nullable=False, server_default='[]'))
  op.add_column('about_content', sa.Column('locations_zh', sa.JSON(), nullable=False, server_default='[]'))
  op.add_column('about_content', sa.Column('contact', sa.JSON(), nullable=False, server_default='{}'))
  op.add_column('about_content', sa.Column('portrait_url', sa.String(length=2048), nullable=True))

  op.alter_column('ai_entries', 'title_en', type_=sa.String(length=100), existing_type=sa.String(length=255))
  op.alter_column('ai_entries', 'title_zh', type_=sa.String(length=100), existing_type=sa.String(length=255))
  op.alter_column('ai_entries', 'description_en', type_=sa.String(length=500), existing_type=sa.Text())
  op.alter_column('ai_entries', 'description_zh', type_=sa.String(length=500), existing_type=sa.Text())
  op.alter_column('ai_entries', 'sort_order', server_default='100', existing_type=sa.Integer())


def downgrade() -> None:
  op.alter_column('ai_entries', 'sort_order', server_default='0', existing_type=sa.Integer())
  op.alter_column('ai_entries', 'description_zh', type_=sa.Text(), existing_type=sa.String(length=500))
  op.alter_column('ai_entries', 'description_en', type_=sa.Text(), existing_type=sa.String(length=500))
  op.alter_column('ai_entries', 'title_zh', type_=sa.String(length=255), existing_type=sa.String(length=100))
  op.alter_column('ai_entries', 'title_en', type_=sa.String(length=255), existing_type=sa.String(length=100))

  op.drop_column('about_content', 'portrait_url')
  op.drop_column('about_content', 'contact')
  op.drop_column('about_content', 'locations_zh')
  op.drop_column('about_content', 'locations_en')

  op.drop_index('ix_photos_category', table_name='photos')
  op.drop_index('ix_photos_location', table_name='photos')
  op.drop_constraint('uq_photos_image_key', 'photos', type_='unique')
  op.alter_column('photos', 'sort_order', server_default='0', existing_type=sa.Integer())
  op.drop_column('photos', 'copyright_year')
  op.drop_column('photos', 'copyright_name')
  op.drop_column('photos', 'file_size')
  op.drop_column('photos', 'mime_type')
  op.drop_column('photos', 'height')
  op.drop_column('photos', 'width')
  op.drop_column('photos', 'thumb_url')
  op.drop_column('photos', 'image_url')
  op.drop_column('photos', 'category')
  op.drop_column('photos', 'location')
  op.alter_column('photos', 'title_zh', type_=sa.String(length=255), existing_type=sa.String(length=100))
  op.alter_column('photos', 'title_en', type_=sa.String(length=255), existing_type=sa.String(length=100))

  op.alter_column('collections', 'sort_order', server_default='0', existing_type=sa.Integer())
  op.alter_column('collections', 'category', type_=sa.String(length=128), existing_type=sa.String(length=50))
  op.alter_column('collections', 'location_zh', type_=sa.String(length=255), existing_type=sa.String(length=100))
  op.alter_column('collections', 'location_en', type_=sa.String(length=255), existing_type=sa.String(length=100))

  op.drop_constraint('uq_home_videos_s3_key', 'home_videos', type_='unique')
  op.alter_column('home_videos', 'is_active', server_default=sa.text('false'), existing_type=sa.Boolean())
  op.alter_column('home_videos', 'sort_order', server_default='0', existing_type=sa.Integer())
  op.alter_column('home_videos', 'title', type_=sa.String(length=255), existing_type=sa.String(length=100))
  op.drop_column('home_videos', 'file_size')
  op.drop_column('home_videos', 'mime_type')
  op.drop_column('home_videos', 'source_url')
