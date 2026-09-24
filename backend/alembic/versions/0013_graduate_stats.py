"""graduates: graduate_stats (нэг мөр)

Revision ID: 0013
Revises: 0012
Create Date: 2026-09-24
"""
from alembic import op
import sqlalchemy as sa

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "graduate_stats",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("total_graduates", sa.Integer, nullable=False, server_default="0"),
        sa.Column("university_percent", sa.SmallInteger, nullable=False, server_default="0"),
        sa.Column("university_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("abroad_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("graduate_stats")
