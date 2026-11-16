"""programs.grade_rates — Cambridge IGCSE дүнгийн хувь жилээр (A*–A, A*–C), дэлхийнхтэй JSONB

Revision ID: 0025
Revises: 0024
Create Date: 2026-11-16
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0025"
down_revision = "0024"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("programs", sa.Column("grade_rates", postgresql.JSONB, nullable=False, server_default="[]"))


def downgrade() -> None:
    op.drop_column("programs", "grade_rates")
