"""add_payment_txn_ref_to_orders

Revision ID: c7d4e1f9a2b3
Revises: bf18e3d58819
Create Date: 2026-05-25 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'c7d4e1f9a2b3'
down_revision: Union[str, None] = 'bf18e3d58819'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'orders',
        sa.Column('payment_txn_ref', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
    )
    op.create_unique_constraint('uq_orders_payment_txn_ref', 'orders', ['payment_txn_ref'])
    op.create_index('ix_orders_payment_txn_ref', 'orders', ['payment_txn_ref'])


def downgrade() -> None:
    op.drop_index('ix_orders_payment_txn_ref', table_name='orders')
    op.drop_constraint('uq_orders_payment_txn_ref', 'orders', type_='unique')
    op.drop_column('orders', 'payment_txn_ref')
