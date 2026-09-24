"""programs: programs, program_works, program_scholarships

Revision ID: 0011
Revises: 0010
Create Date: 2026-09-24
"""
from alembic import op
import sqlalchemy as sa

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "programs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("slug", sa.String(200), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("badge", sa.String(40), nullable=False),
        sa.Column("summary", sa.String(280), nullable=False, server_default=""),
        sa.Column("cover_image", sa.String(255), nullable=True),
        sa.Column("grade_from", sa.SmallInteger, nullable=False, server_default="11"),
        sa.Column("grade_to", sa.SmallInteger, nullable=False, server_default="12"),
        sa.Column("body_html", sa.Text, nullable=False, server_default=""),
        sa.Column("order", sa.SmallInteger, nullable=False, server_default="0"),
        sa.Column("is_published", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_programs_slug", "programs", ["slug"], unique=True)
    op.create_table(
        "program_works",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("program_id", sa.Integer, sa.ForeignKey("programs.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("image", sa.String(255), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("student", sa.String(120), nullable=False, server_default=""),
        sa.Column("caption", sa.String(280), nullable=False, server_default=""),
        sa.Column("order", sa.SmallInteger, nullable=False, server_default="0"),
    )
    op.create_table(
        "program_scholarships",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("program_id", sa.Integer, sa.ForeignKey("programs.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("student_name", sa.String(120), nullable=False),
        sa.Column("photo", sa.String(255), nullable=True),
        sa.Column("university", sa.String(160), nullable=False, server_default=""),
        sa.Column("year", sa.SmallInteger, nullable=False),
        sa.Column("amount_usd", sa.Integer, nullable=False, server_default="0"),
        sa.Column("order", sa.SmallInteger, nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_table("program_scholarships")
    op.drop_table("program_works")
    op.drop_index("ix_programs_slug", table_name="programs")
    op.drop_table("programs")
