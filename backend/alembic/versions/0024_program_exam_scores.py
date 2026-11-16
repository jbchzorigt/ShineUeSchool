"""programs.exam_scores — шалгалтын дундаж оноо жилээр, дэлхийн дундажтай (IB дипломын 45 оноо) JSONB

Revision ID: 0024
Revises: 0023
Create Date: 2026-11-16
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0024"
down_revision = "0023"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("programs", sa.Column("exam_scores", postgresql.JSONB, nullable=False, server_default="[]"))


def downgrade() -> None:
    op.drop_column("programs", "exam_scores")
