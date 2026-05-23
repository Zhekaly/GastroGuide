"""make_offer_discount_nullable

Revision ID: 13c22e57f0b9
Revises: b1c2d3e4f5a6
Create Date: 2026-05-23 11:40:06.464235

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '13c22e57f0b9'
down_revision: Union[str, Sequence[str], None] = 'b1c2d3e4f5a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Make offers.discount nullable — discount becomes an optional field."""
    op.alter_column(
        "offers",
        "discount",
        existing_type=sa.String(length=50),
        nullable=True,
    )


def downgrade() -> None:
    """Restore NOT NULL on offers.discount. Backfill NULLs with '' first so the
    constraint can be re-applied even if rows without a discount were created
    while the column was nullable."""
    op.execute("UPDATE offers SET discount = '' WHERE discount IS NULL")
    op.alter_column(
        "offers",
        "discount",
        existing_type=sa.String(length=50),
        nullable=False,
    )
