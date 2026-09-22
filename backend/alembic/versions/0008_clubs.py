"""clubs: rounds, clubs, images, registrations, email codes

Revision ID: 0008
Revises: 0007
Create Date: 2026-09-21
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "club_rounds",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "clubs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("round_id", sa.Integer, sa.ForeignKey("club_rounds.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("description", sa.Text, nullable=False, server_default=""),
        sa.Column("grades", ARRAY(sa.Integer), nullable=False),
        sa.Column("capacity", sa.Integer, nullable=False),
        sa.Column("is_paid", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("fee", sa.Integer, nullable=False, server_default="0"),
        sa.Column("fee_note", sa.String(120), nullable=False, server_default=""),
        sa.Column("registration_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("registration_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_published", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "club_images",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("club_id", sa.Integer, sa.ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("file", sa.String(255), nullable=False),
        sa.Column("order", sa.Integer, nullable=False, server_default="0"),
    )
    op.create_table(
        "club_registrations",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("club_id", sa.Integer, sa.ForeignKey("clubs.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("round_id", sa.Integer, sa.ForeignKey("club_rounds.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("student_last_name", sa.String(80), nullable=False),
        sa.Column("student_first_name", sa.String(80), nullable=False),
        sa.Column("guardian_last_name", sa.String(80), nullable=False),
        sa.Column("guardian_first_name", sa.String(80), nullable=False),
        sa.Column("phone", sa.String(30), nullable=False),
        sa.Column("grade", sa.Integer, nullable=False),
        sa.Column("status", sa.String(12), nullable=False, server_default="confirmed"),
        sa.Column("is_paid_marked", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("removed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("uq_club_reg_round_email", "club_registrations", ["round_id", "email"], unique=True,
                    postgresql_where=sa.text("status = 'confirmed'"))
    op.create_table(
        "email_codes",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("email", sa.String(254), nullable=False, unique=True),
        sa.Column("code_hash", sa.String(128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer, nullable=False, server_default="0"),
        sa.Column("sent_count", sa.Integer, nullable=False, server_default="1"),
        sa.Column("first_sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("email_codes")
    op.drop_index("uq_club_reg_round_email", table_name="club_registrations")
    op.drop_table("club_registrations")
    op.drop_table("club_images")
    op.drop_table("clubs")
    op.drop_table("club_rounds")
