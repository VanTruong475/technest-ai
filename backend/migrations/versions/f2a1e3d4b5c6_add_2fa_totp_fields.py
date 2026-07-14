"""add_2fa_totp_fields

Revision ID: f2a1e3d4b5c6
Revises: fe64d2e010e4
Create Date: 2026-07-14 12:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = "f2a1e3d4b5c6"
down_revision: Union[str, None] = "fe64d2e010e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("totp_secret", sqlmodel.sql.sqltypes.AutoString(length=32), nullable=True))
    op.add_column("users", sa.Column("is_2fa_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")))


def downgrade() -> None:
    op.drop_column("users", "is_2fa_enabled")
    op.drop_column("users", "totp_secret")
