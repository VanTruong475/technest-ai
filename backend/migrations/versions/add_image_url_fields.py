"""add image_url to products and order_items

Revision ID: b1c2d3e4f5a6
Revises: e9c7871153ab
Create Date: 2026-05-17 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, None] = 'e9c7871153ab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('products', sa.Column('image_url', sa.String(), nullable=True))
    op.add_column('order_items', sa.Column('image_url', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('order_items', 'image_url')
    op.drop_column('products', 'image_url')
