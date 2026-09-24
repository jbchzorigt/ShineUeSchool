"""graduates: graduate_countries

Revision ID: 0012
Revises: 0011
Create Date: 2026-09-24
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "graduate_countries",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("code", sa.String(2), nullable=False),
        sa.Column("universities", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("order", sa.SmallInteger, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_graduate_countries_code", "graduate_countries", ["code"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_graduate_countries_code", table_name="graduate_countries")
    op.drop_table("graduate_countries")
