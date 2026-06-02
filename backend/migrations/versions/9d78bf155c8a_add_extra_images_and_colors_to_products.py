"""add_extra_images_and_colors_to_products

Revision ID: 9d78bf155c8a
Revises: a3b4c5d6e7f8
Create Date: 2026-06-02 20:20:01.748439

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '9d78bf155c8a'
down_revision: Union[str, None] = 'a3b4c5d6e7f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Only add the two new columns — skip constraints that already exist in production
    op.add_column('products', sa.Column('extra_images', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('products', sa.Column('colors', sqlmodel.sql.sqltypes.AutoString(), nullable=True))


def downgrade() -> None:
    op.drop_column('products', 'colors')
    op.drop_column('products', 'extra_images')
