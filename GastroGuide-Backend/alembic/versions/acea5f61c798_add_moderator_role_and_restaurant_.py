"""add moderator role and restaurant_moderators table

Revision ID: acea5f61c798
Revises: 13c22e57f0b9
Create Date: 2026-05-23 12:05:47.171361

The 'moderator' role itself does not require a schema change — `users.role`
is already a free String(20). Validation is enforced at the Pydantic layer
(Literal["user", "admin", "moderator"]).

This migration only creates the many-to-many association table
`restaurant_moderators` with audit fields (assigned_at, assigned_by).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'acea5f61c798'
down_revision: Union[str, Sequence[str], None] = '13c22e57f0b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "restaurant_moderators",
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "restaurant_id",
            sa.Integer(),
            sa.ForeignKey("restaurants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "assigned_by",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("user_id", "restaurant_id", name="pk_restaurant_moderators"),
    )
    op.create_index(
        "ix_restaurant_moderators_user_id",
        "restaurant_moderators",
        ["user_id"],
    )
    op.create_index(
        "ix_restaurant_moderators_restaurant_id",
        "restaurant_moderators",
        ["restaurant_id"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        "ix_restaurant_moderators_restaurant_id",
        table_name="restaurant_moderators",
    )
    op.drop_index(
        "ix_restaurant_moderators_user_id",
        table_name="restaurant_moderators",
    )
    op.drop_table("restaurant_moderators")
