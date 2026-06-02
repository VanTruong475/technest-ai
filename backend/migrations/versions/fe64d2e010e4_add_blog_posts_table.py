"""add_blog_posts_table

Revision ID: fe64d2e010e4
Revises: 9d78bf155c8a
Create Date: 2026-06-03 00:46:22.072538

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'fe64d2e010e4'
down_revision: Union[str, None] = '9d78bf155c8a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('blog_posts',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('excerpt', sa.Text(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('image_url', sa.Text(), nullable=True),
        sa.Column('author_id', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=True),
        sa.Column('tags', sa.Text(), nullable=True),
        sa.Column('published', sa.Boolean(), nullable=False),
        sa.Column('published_at', postgresql.TIMESTAMP(), nullable=True),
        sa.Column('view_count', sa.Integer(), nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(), nullable=False),
        sa.Column('updated_at', postgresql.TIMESTAMP(), nullable=False),
        sa.ForeignKeyConstraint(['author_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_blog_posts_slug', 'blog_posts', ['slug'], unique=True)
    op.create_index('ix_blog_posts_published', 'blog_posts', ['published'], unique=False)
    op.create_index('ix_blog_posts_category', 'blog_posts', ['category'], unique=False)
    op.create_index('ix_blog_posts_author_id', 'blog_posts', ['author_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_blog_posts_author_id', table_name='blog_posts')
    op.drop_index('ix_blog_posts_category', table_name='blog_posts')
    op.drop_index('ix_blog_posts_published', table_name='blog_posts')
    op.drop_index('ix_blog_posts_slug', table_name='blog_posts')
    op.drop_table('blog_posts')
