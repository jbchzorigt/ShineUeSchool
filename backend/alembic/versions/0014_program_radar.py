"""programs.radar — радар графикийн JSONB (ЭЕШ-ийн оноо г.м.)

Revision ID: 0014
Revises: 0013
Create Date: 2026-09-24
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("programs", sa.Column("radar", postgresql.JSONB, nullable=False, server_default="{}"))


def downgrade() -> None:
    op.drop_column("programs", "radar")
