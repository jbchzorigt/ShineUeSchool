"""Англи хувилбар: мэдээ, ангилал, зураг, хөтөлбөр, бүтээл, бидний тухай хүснэгтүүдэд `_en` баганууд (анхдагч "")

Revision ID: 0015
Revises: 0014
Create Date: 2026-10-20
"""
from alembic import op
import sqlalchemy as sa

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None

COLUMNS: list[tuple[str, str, sa.types.TypeEngine]] = [
    ("news_posts", "title_en", sa.String(200)),
    ("news_posts", "excerpt_en", sa.String(280)),
    ("news_posts", "body_html_en", sa.Text()),
    ("news_categories", "name_en", sa.String(80)),
    ("news_images", "caption_en", sa.String(200)),
    ("programs", "name_en", sa.String(120)),
    ("programs", "summary_en", sa.String(280)),
    ("programs", "body_html_en", sa.Text()),
    ("program_works", "title_en", sa.String(160)),
    ("program_works", "caption_en", sa.String(280)),
    ("about_page", "intro_title_en", sa.String(160)),
    ("about_page", "intro_html_en", sa.Text()),
    ("about_leaders", "position_en", sa.String(160)),
    ("about_departments", "name_en", sa.String(120)),
    ("about_teachers", "role_en", sa.String(120)),
]


def upgrade() -> None:
    for table, name, type_ in COLUMNS:
        op.add_column(table, sa.Column(name, type_, nullable=False, server_default=""))


def downgrade() -> None:
    for table, name, _ in reversed(COLUMNS):
        op.drop_column(table, name)
