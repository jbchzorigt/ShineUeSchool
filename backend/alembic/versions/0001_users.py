"""users, roles, user_roles

Revision ID: 0001
Revises:
Create Date: 2026-09-18
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("code", sa.String(30), nullable=False, unique=True),
        sa.Column("name", sa.String(80), nullable=False),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("username", sa.String(150), nullable=False, unique=True, index=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(150), nullable=False, server_default=""),
        sa.Column("email", sa.String(254), nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("is_superuser", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "user_roles",
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("role_id", sa.Integer, sa.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    )
    op.bulk_insert(
        sa.table("roles", sa.column("code", sa.String), sa.column("name", sa.String)),
        [
            {"code": "manager", "name": "Сургалтын менежер"},
            {"code": "olympiad", "name": "Олимпиад"},
            {"code": "news", "name": "Мэдээ"},
        ],
    )


def downgrade() -> None:
    op.drop_table("user_roles")
    op.drop_table("users")
    op.drop_table("roles")
