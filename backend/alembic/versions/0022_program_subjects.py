"""programs.subjects — хөтөлбөрийн заадаг хичээлүүд (бүлэг, нэр, тэмдэг, товч тайлбар) JSONB

Revision ID: 0022
Revises: 0021
Create Date: 2026-11-09
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0022"
down_revision = "0021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("programs", sa.Column("subjects", postgresql.JSONB, nullable=False, server_default="[]"))


def downgrade() -> None:
    op.drop_column("programs", "subjects")
