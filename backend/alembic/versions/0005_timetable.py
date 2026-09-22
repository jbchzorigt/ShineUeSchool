"""timetable: academic years, period sets, periods, subjects, teachers, rooms, class groups, lessons, curriculum, calendar

Revision ID: 0005
Revises: 0004
Create Date: 2026-09-21
"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "academic_years",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(40), nullable=False, unique=True),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
        sa.Column("working_days", sa.SmallInteger, nullable=False, server_default="5"),
        sa.Column("is_current", sa.Boolean, nullable=False, server_default=sa.false()),
    )
    op.create_index("uq_academic_years_current", "academic_years", ["is_current"], unique=True,
                    postgresql_where=sa.text("is_current"))
    op.create_table(
        "period_sets",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("year_id", sa.Integer, sa.ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("name", sa.String(60), nullable=False),
        sa.UniqueConstraint("year_id", "name", name="uq_period_sets_year_name"),
    )
    op.create_table(
        "periods",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("period_set_id", sa.Integer, sa.ForeignKey("period_sets.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("order", sa.SmallInteger, nullable=False),
        sa.Column("start_time", sa.Time, nullable=False),
        sa.Column("end_time", sa.Time, nullable=False),
        sa.Column("is_break", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.UniqueConstraint("period_set_id", "order", name="uq_periods_set_order"),
        sa.CheckConstraint("end_time > start_time", name="ck_periods_time"),
    )
    op.create_table(
        "subjects",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(80), nullable=False, unique=True),
        sa.Column("short_name", sa.String(20), nullable=False),
        sa.Column("color", sa.String(7), nullable=False, server_default="#1e3a8f"),
    )
    op.create_table(
        "teachers",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("last_name", sa.String(80), nullable=False, server_default=""),
        sa.Column("first_name", sa.String(80), nullable=False),
        sa.Column("short_name", sa.String(40), nullable=False, unique=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
    )
    op.create_table(
        "teacher_subjects",
        sa.Column("teacher_id", sa.Integer, sa.ForeignKey("teachers.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("subject_id", sa.Integer, sa.ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_table(
        "rooms",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(40), nullable=False, unique=True),
        sa.Column("capacity", sa.SmallInteger, nullable=True),
        sa.Column("kind", sa.String(12), nullable=False, server_default="classroom"),
    )
    op.create_table(
        "class_groups",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("year_id", sa.Integer, sa.ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("grade", sa.SmallInteger, nullable=False),
        sa.Column("letter", sa.String(4), nullable=False),
        sa.Column("period_set_id", sa.Integer, sa.ForeignKey("period_sets.id"), nullable=False),
        sa.Column("homeroom_teacher_id", sa.Integer, sa.ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True),
        sa.UniqueConstraint("year_id", "grade", "letter", name="uq_class_groups_year_grade_letter"),
        sa.CheckConstraint("grade BETWEEN 1 AND 12", name="ck_class_groups_grade"),
    )
    op.create_table(
        "lessons",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("class_group_id", sa.Integer, sa.ForeignKey("class_groups.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("weekday", sa.SmallInteger, nullable=False),
        sa.Column("period_id", sa.Integer, sa.ForeignKey("periods.id"), nullable=False),
        sa.Column("subject_id", sa.Integer, sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("teacher_id", sa.Integer, sa.ForeignKey("teachers.id"), nullable=False, index=True),
        sa.Column("room_id", sa.Integer, sa.ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.UniqueConstraint("class_group_id", "weekday", "period_id", name="uq_lessons_class_weekday_period"),
        sa.CheckConstraint("weekday BETWEEN 1 AND 6", name="ck_lessons_weekday"),
    )
    op.create_table(
        "curriculum_entries",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("class_group_id", sa.Integer, sa.ForeignKey("class_groups.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("subject_id", sa.Integer, sa.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("hours_per_week", sa.SmallInteger, nullable=False),
        sa.UniqueConstraint("class_group_id", "subject_id", name="uq_curriculum_class_subject"),
    )
    op.create_table(
        "calendar_events",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("year_id", sa.Integer, sa.ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("category", sa.String(10), nullable=False, server_default="event"),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
        sa.Column("description", sa.Text, nullable=False, server_default=""),
        sa.Column("applies_to", sa.String(10), nullable=False, server_default="all"),
        sa.CheckConstraint("end_date >= start_date", name="ck_calendar_events_dates"),
    )


def downgrade() -> None:
    for t in ("calendar_events", "curriculum_entries", "lessons", "class_groups", "rooms", "teacher_subjects",
              "teachers", "subjects", "periods", "period_sets"):
        op.drop_table(t)
    op.drop_index("uq_academic_years_current", table_name="academic_years")
    op.drop_table("academic_years")
