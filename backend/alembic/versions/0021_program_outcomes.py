"""programs.outcomes — төгсөгчдийн үр дүн жилээр (төгссөн, гадаадад элссэн) JSONB

Revision ID: 0021
Revises: 0020
Create Date: 2026-11-05
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0021"
down_revision = "0020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("programs", sa.Column("outcomes", postgresql.JSONB, nullable=False, server_default="[]"))


def downgrade() -> None:
    op.drop_column("programs", "outcomes")
