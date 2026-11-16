"""page_views — сайтын хандалт (хуудас үзэлт; зочин нь нэргүй санамсаргүй ID)

Revision ID: 0026
Revises: 0025
Create Date: 2026-11-16
"""
from alembic import op
import sqlalchemy as sa

revision = "0026"
down_revision = "0025"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "page_views",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("path", sa.String(200), nullable=False),
        sa.Column("visitor", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_page_views_day", "page_views", ["day"])
    op.create_index("ix_page_views_visitor", "page_views", ["visitor"])
    op.create_index("ix_page_views_day_visitor", "page_views", ["day", "visitor"])


def downgrade() -> None:
    op.drop_table("page_views")
