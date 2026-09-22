"""news: categories, posts, images, comments, likes; visitors

Revision ID: 0004
Revises: 0003
Create Date: 2026-09-19
"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "visitors",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("fb_id", sa.String(64), nullable=False, unique=True, index=True),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("avatar_url", sa.String(500), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("is_blocked", sa.Boolean, nullable=False, server_default=sa.false()),
    )
    op.create_table(
        "news_categories",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("slug", sa.String(80), nullable=False, unique=True),
        sa.Column("order", sa.SmallInteger, nullable=False, server_default="0"),
    )
    op.create_table(
        "news_posts",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(220), nullable=False, unique=True, index=True),
        sa.Column("excerpt", sa.String(280), nullable=False, server_default=""),
        sa.Column("body_html", sa.Text, nullable=False, server_default=""),
        sa.Column("cover_image", sa.String(255), nullable=True),
        sa.Column("category_id", sa.Integer, sa.ForeignKey("news_categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True, index=True),
        sa.Column("is_published", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("author_id", sa.Integer, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("fb_post_id", sa.String(100), nullable=True),
        sa.Column("fb_error", sa.Text, nullable=True),
    )
    op.create_table(
        "news_images",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("post_id", sa.Integer, sa.ForeignKey("news_posts.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("image", sa.String(255), nullable=False),
        sa.Column("caption", sa.String(200), nullable=False, server_default=""),
        sa.Column("order", sa.SmallInteger, nullable=False, server_default="0"),
    )
    op.create_table(
        "news_comments",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("post_id", sa.Integer, sa.ForeignKey("news_posts.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("visitor_id", sa.Integer, sa.ForeignKey("visitors.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("is_hidden", sa.Boolean, nullable=False, server_default=sa.false()),
    )
    op.create_table(
        "news_likes",
        sa.Column("post_id", sa.Integer, sa.ForeignKey("news_posts.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("visitor_id", sa.Integer, sa.ForeignKey("visitors.id", ondelete="CASCADE"), primary_key=True),
    )


def downgrade() -> None:
    for t in ("news_likes", "news_comments", "news_images", "news_posts", "news_categories", "visitors"):
        op.drop_table(t)
