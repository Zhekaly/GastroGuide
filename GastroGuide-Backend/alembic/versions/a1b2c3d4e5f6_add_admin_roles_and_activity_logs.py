"""add admin roles, restaurant is_hidden and activity_logs

Revision ID: a1b2c3d4e5f6
Revises: 490d4685668c
Create Date: 2026-05-12 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "490d4685668c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.String(length=20),
            nullable=False,
            server_default="user",
        ),
    )
    op.create_index("ix_users_role", "users", ["role"])

    op.add_column(
        "users",
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )

    op.add_column(
        "restaurants",
        sa.Column(
            "is_hidden",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.create_index("ix_restaurants_is_hidden", "restaurants", ["is_hidden"])

    op.create_table(
        "activity_logs",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column(
            "admin_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("action", sa.String(length=80), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", sa.String(length=64), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_activity_logs_admin_id", "activity_logs", ["admin_id"])
    op.create_index("ix_activity_logs_action", "activity_logs", ["action"])
    op.create_index("ix_activity_logs_entity_type", "activity_logs", ["entity_type"])
    op.create_index("ix_activity_logs_entity_id", "activity_logs", ["entity_id"])
    op.create_index("ix_activity_logs_created_at", "activity_logs", ["created_at"])


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index("ix_activity_logs_created_at", table_name="activity_logs")
    op.drop_index("ix_activity_logs_entity_id", table_name="activity_logs")
    op.drop_index("ix_activity_logs_entity_type", table_name="activity_logs")
    op.drop_index("ix_activity_logs_action", table_name="activity_logs")
    op.drop_index("ix_activity_logs_admin_id", table_name="activity_logs")
    op.drop_table("activity_logs")

    op.drop_index("ix_restaurants_is_hidden", table_name="restaurants")
    op.drop_column("restaurants", "is_hidden")

    op.drop_column("users", "is_active")
    op.drop_index("ix_users_role", table_name="users")
    op.drop_column("users", "role")
