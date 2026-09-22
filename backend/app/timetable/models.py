"""Хичээлийн хуваарь: жил, цагийн хүснэгт, анги, хичээл, багш, өрөө, хуваарь, хөтөлбөр, календарь."""

from datetime import date, time

from sqlalchemy import (
    Boolean, CheckConstraint, Column, Date, ForeignKey, Index, Integer, SmallInteger, String, Table, Text, Time,
    UniqueConstraint, text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base

WEEKDAY_NAMES: dict[int, str] = {1: "Даваа", 2: "Мягмар", 3: "Лхагва", 4: "Пүрэв", 5: "Баасан", 6: "Бямба"}
ROOM_KINDS = ("classroom", "lab", "gym", "other")
EVENT_CATEGORIES = ("term", "holiday", "exam", "event", "other")
APPLIES_TO = ("all", "primary", "secondary", "high")


class AcademicYear(Base):
    __tablename__ = "academic_years"
    __table_args__ = (
        # Зөвхөн нэг мөр is_current=true байж болно (partial unique index)
        Index("uq_academic_years_current", "is_current", unique=True, postgresql_where=text("is_current")),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(40), unique=True)  # "2026–2027"
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    working_days: Mapped[int] = mapped_column(SmallInteger, default=5)  # 5 эсвэл 6
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)


class PeriodSet(Base):
    """Цагийн хүснэгт: "Бага анги", "Дунд, ахлах анги" гэх мэт; ангиуд аль нэгийг нь ашиглана."""
    __tablename__ = "period_sets"
    __table_args__ = (UniqueConstraint("year_id", "name", name="uq_period_sets_year_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year_id: Mapped[int] = mapped_column(ForeignKey("academic_years.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(60))

    periods: Mapped[list["Period"]] = relationship(
        lazy="selectin", order_by="Period.start_time", cascade="all, delete-orphan", passive_deletes=True
    )


class Period(Base):
    __tablename__ = "periods"
    __table_args__ = (
        UniqueConstraint("period_set_id", "order", name="uq_periods_set_order"),
        CheckConstraint("end_time > start_time", name="ck_periods_time"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    period_set_id: Mapped[int] = mapped_column(ForeignKey("period_sets.id", ondelete="CASCADE"), index=True)
    # Хичээлийн дугаар (1..n); завсарлага 101-ээс дээш (харагдахгүй). Мөрүүд start_time-аар эрэмблэгдэнэ.
    order: Mapped[int] = mapped_column(SmallInteger)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    is_break: Mapped[bool] = mapped_column(Boolean, default=False)


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    short_name: Mapped[str] = mapped_column(String(20))
    color: Mapped[str] = mapped_column(String(7), default="#1e3a8f")


teacher_subjects = Table(
    "teacher_subjects", Base.metadata,
    Column("teacher_id", ForeignKey("teachers.id", ondelete="CASCADE"), primary_key=True),
    Column("subject_id", ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True),
)


class Teacher(Base):
    __tablename__ = "teachers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    last_name: Mapped[str] = mapped_column(String(80), default="")
    first_name: Mapped[str] = mapped_column(String(80))
    short_name: Mapped[str] = mapped_column(String(40), unique=True)  # "Б.Мухулай"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    subjects: Mapped[list[Subject]] = relationship(secondary=teacher_subjects, lazy="selectin")

    @property
    def full_name(self) -> str:
        return f"{self.last_name} {self.first_name}".strip()


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(40), unique=True)
    capacity: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    kind: Mapped[str] = mapped_column(String(12), default="classroom")


class ClassGroup(Base):
    """Бүлэг анги: 9а. period_set нь тухайн ангийн цагийн хүснэгт."""
    __tablename__ = "class_groups"
    __table_args__ = (
        UniqueConstraint("year_id", "grade", "letter", name="uq_class_groups_year_grade_letter"),
        CheckConstraint("grade BETWEEN 1 AND 12", name="ck_class_groups_grade"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year_id: Mapped[int] = mapped_column(ForeignKey("academic_years.id", ondelete="CASCADE"), index=True)
    grade: Mapped[int] = mapped_column(SmallInteger)
    letter: Mapped[str] = mapped_column(String(4))
    period_set_id: Mapped[int] = mapped_column(ForeignKey("period_sets.id"))  # ашиглагдаж байвал устгахгүй
    homeroom_teacher_id: Mapped[int | None] = mapped_column(ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)

    year: Mapped[AcademicYear] = relationship(lazy="selectin")
    period_set: Mapped[PeriodSet] = relationship(lazy="selectin")

    @property
    def name(self) -> str:
        return f"{self.grade}{self.letter}"


class Lesson(Base):
    __tablename__ = "lessons"
    __table_args__ = (
        UniqueConstraint("class_group_id", "weekday", "period_id", name="uq_lessons_class_weekday_period"),
        CheckConstraint("weekday BETWEEN 1 AND 6", name="ck_lessons_weekday"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    class_group_id: Mapped[int] = mapped_column(ForeignKey("class_groups.id", ondelete="CASCADE"), index=True)
    weekday: Mapped[int] = mapped_column(SmallInteger)
    period_id: Mapped[int] = mapped_column(ForeignKey("periods.id"))
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"))
    teacher_id: Mapped[int] = mapped_column(ForeignKey("teachers.id"), index=True)
    room_id: Mapped[int | None] = mapped_column(ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True, index=True)

    class_group: Mapped[ClassGroup] = relationship(lazy="selectin")
    period: Mapped[Period] = relationship(lazy="selectin")
    subject: Mapped[Subject] = relationship(lazy="selectin")
    teacher: Mapped[Teacher] = relationship(lazy="selectin")
    room: Mapped[Room | None] = relationship(lazy="selectin")


class CurriculumEntry(Base):
    """Хөтөлбөр: анги бүрт хичээл бүр долоо хоногт хэдэн цаг."""
    __tablename__ = "curriculum_entries"
    __table_args__ = (UniqueConstraint("class_group_id", "subject_id", name="uq_curriculum_class_subject"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    class_group_id: Mapped[int] = mapped_column(ForeignKey("class_groups.id", ondelete="CASCADE"), index=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"))
    hours_per_week: Mapped[int] = mapped_column(SmallInteger)

    subject: Mapped[Subject] = relationship(lazy="selectin")


class CalendarEvent(Base):
    __tablename__ = "calendar_events"
    __table_args__ = (CheckConstraint("end_date >= start_date", name="ck_calendar_events_dates"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    year_id: Mapped[int] = mapped_column(ForeignKey("academic_years.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(10), default="event")  # term|holiday|exam|event|other
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    description: Mapped[str] = mapped_column(Text, default="")
    applies_to: Mapped[str] = mapped_column(String(10), default="all")  # all|primary|secondary|high
    color: Mapped[str] = mapped_column(String(7), default="")  # "#rrggbb"; хоосон бол ангиллын анхдагч өнгө
