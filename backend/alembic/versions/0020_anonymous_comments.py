"""anonymous news comments: author name and ip hash

Revision ID: 0020
Revises: 0019
Create Date: 2026-11-05
"""
from alembic import op
import sqlalchemy as sa

revision = "0020"
down_revision = "0019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("news_comments", sa.Column("author_name", sa.String(80), nullable=False, server_default=""))
    op.add_column("news_comments", sa.Column("ip_hash", sa.String(64), nullable=False, server_default=""))
    op.create_index("ix_news_comments_ip_hash", "news_comments", ["ip_hash"])
    op.alter_column("news_comments", "visitor_id", existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    op.execute("DELETE FROM news_comments WHERE visitor_id IS NULL")
    op.alter_column("news_comments", "visitor_id", existing_type=sa.Integer(), nullable=False)
    op.drop_index("ix_news_comments_ip_hash", table_name="news_comments")
    op.drop_column("news_comments", "ip_hash")
    op.drop_column("news_comments", "author_name")
