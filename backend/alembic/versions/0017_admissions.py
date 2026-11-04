"""admissions: admission_rounds, admission_applicants + "admissions.view|edit" эрх

Revision ID: 0017
Revises: 0016
Create Date: 2026-11-02

Эрх: хуучин "manager" бүлэг (0016-аар "clubs.edit" болсон) элсэлтийг удирддаг байсан тул clubs.edit эрхтэй хүмүүст
admissions.edit олгоно.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0017"
down_revision = "0016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "admission_rounds",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("name_en", sa.String(120), nullable=False, server_default=""),
        sa.Column("code_prefix", sa.String(8), nullable=False),
        sa.Column("grades", postgresql.ARRAY(sa.Integer), nullable=False),
        sa.Column("test_info", sa.Text, nullable=False, server_default=""),
        sa.Column("test_info_en", sa.Text, nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("registration_open", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("registration_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("results_published", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("results_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("results_published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        # Бүртгэл, дүн хоёр зэрэг асах боломжгүй
        sa.CheckConstraint("NOT (registration_open AND results_published)", name="ck_admission_one_section_on"),
    )
    op.create_table(
        "admission_applicants",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("round_id", sa.Integer, sa.ForeignKey("admission_rounds.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("code", sa.String(16), nullable=False, unique=True),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("child_last_name", sa.String(80), nullable=False),
        sa.Column("child_first_name", sa.String(80), nullable=False),
        sa.Column("birth_date", sa.Date, nullable=False),
        sa.Column("gender", sa.String(8), nullable=False),
        sa.Column("current_school", sa.String(160), nullable=False, server_default=""),
        sa.Column("grade", sa.Integer, nullable=False),
        sa.Column("guardian_last_name", sa.String(80), nullable=False),
        sa.Column("guardian_first_name", sa.String(80), nullable=False),
        sa.Column("phone", sa.String(30), nullable=False),
        sa.Column("status", sa.String(12), nullable=False, server_default="registered"),
        sa.Column("lang", sa.String(2), nullable=False, server_default="mn"),
        sa.Column("score", sa.Numeric(6, 2), nullable=True),
        sa.Column("result", sa.String(12), nullable=True),
        sa.Column("consent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_admission_applicants_round_id", "admission_applicants", ["round_id"])
    op.create_index("ix_admission_applicants_email", "admission_applicants", ["email"])
    op.create_index(
        "uq_admission_child", "admission_applicants",
        ["round_id", "email", "child_last_name", "child_first_name", "birth_date"],
        unique=True, postgresql_where=sa.text("status = 'registered'"),
    )
    conn = op.get_bind()
    for lv, lname in (("view", "харах"), ("edit", "засах")):
        conn.execute(sa.text("INSERT INTO roles (code, name) VALUES (:c, :n) ON CONFLICT (code) DO NOTHING"),
                     {"c": f"admissions.{lv}", "n": f"Элсэлт — {lname}"})
    conn.execute(sa.text("""
        INSERT INTO user_roles (user_id, role_id)
        SELECT ur.user_id, new.id FROM user_roles ur
        JOIN roles old ON old.id = ur.role_id AND old.code = 'clubs.edit'
        JOIN roles new ON new.code = 'admissions.edit'
        ON CONFLICT DO NOTHING
    """))


def downgrade() -> None:
    op.execute("DELETE FROM roles WHERE code IN ('admissions.view', 'admissions.edit')")
    op.drop_table("admission_applicants")
    op.drop_table("admission_rounds")
