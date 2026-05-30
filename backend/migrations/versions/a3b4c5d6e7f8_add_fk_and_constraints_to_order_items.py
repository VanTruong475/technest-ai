"""add fk and constraints to order_items

Revision ID: a3b4c5d6e7f8
Revises: 80c1a7c1885f
Create Date: 2026-05-30 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3b4c5d6e7f8'
down_revision: Union[str, None] = '80c1a7c1885f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # FK: order_items.product_id -> products.id
    op.create_foreign_key(
        'fk_order_items_product_id',
        'order_items',
        'products',
        ['product_id'],
        ['id'],
    )
    # CheckConstraint: quantity > 0
    op.create_check_constraint(
        'ck_order_items_quantity_positive',
        'order_items',
        'quantity > 0',
    )


def downgrade() -> None:
    op.drop_constraint('ck_order_items_quantity_positive', 'order_items', type_='check')
    op.drop_constraint('fk_order_items_product_id', 'order_items', type_='foreignkey')
