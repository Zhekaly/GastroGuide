"""add unique constraint for reviews

Revision ID: 868c16d3e1b9
Revises: 77d3ed1771f6
Create Date: 2026-03-21 14:58:46.891671

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '868c16d3e1b9'
down_revision: Union[str, Sequence[str], None] = '77d3ed1771f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.create_unique_constraint(
        "uq_user_restaurant_review",
        "reviews",
        ["user_id", "restaurant_id"]
    )


def downgrade():
    op.drop_constraint(
        "uq_user_restaurant_review",
        "reviews",
        type_="unique"
    )
