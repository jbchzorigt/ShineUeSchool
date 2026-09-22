"""Хуваарийн pydantic схемүүд. JSON бүтэц frontend/src/lib/types.ts-ийн timetable төрлүүдтэй тохирно."""

from datetime import date as _date
from datetime import time as _time
from typing import Literal

from pydantic import BaseModel, Field

RoomKind = Literal["classroom", "lab", "gym", "other"]
EventCategory = Literal["term", "holiday", "exam", "event", "other"]
AppliesTo = Literal["all", "primary", "secondary", "high"]
ConflictKind = Literal["teacher", "room"]


class _Orm(BaseModel):
    model_config = {"from_attributes": True}


# ---- жил ----
class YearIn(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    start_date: _date
    end_date: _date
    working_days: int = Field(default=5, ge=5, le=6)


class YearPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=40)
    start_date: _date | None = None
    end_date: _date | None = None
    working_days: int | None = Field(default=None, ge=5, le=6)


class YearOut(_Orm):
    id: int
    name: str
    start_date: _date
    end_date: _date
    working_days: int
    is_current: bool


# ---- цагийн хүснэгт ----
class PeriodIn(BaseModel):
    period_set_id: int
    order: int = Field(ge=1, le=199)  # 1–99 хичээл, 101–199 завсарлага
    start_time: _time
    end_time: _time
    is_break: bool = False


class PeriodPatch(BaseModel):
    order: int | None = Field(default=None, ge=1, le=199)  # 1–99 хичээл, 101–199 завсарлага
    start_time: _time | None = None
    end_time: _time | None = None
    is_break: bool | None = None


class PeriodOut(_Orm):
    id: int
    period_set_id: int
    order: int
    start_time: _time
    end_time: _time
    is_break: bool


class PeriodSetIn(BaseModel):
    year_id: int
    name: str = Field(min_length=1, max_length=60)


class PeriodSetPatch(BaseModel):
    name: str = Field(min_length=1, max_length=60)


class PeriodSetOut(_Orm):
    id: int
    year_id: int
    name: str
    periods: list[PeriodOut]


# ---- хичээл, багш, өрөө ----
class SubjectIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    short_name: str = Field(min_length=1, max_length=20)
    color: str = Field(default="#1e3a8f", pattern=r"^#[0-9a-fA-F]{6}$")


class SubjectPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    short_name: str | None = Field(default=None, min_length=1, max_length=20)
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")


class SubjectOut(_Orm):
    id: int
    name: str
    short_name: str
    color: str


class TeacherIn(BaseModel):
    last_name: str = Field(default="", max_length=80)
    first_name: str = Field(min_length=1, max_length=80)
    short_name: str = Field(min_length=1, max_length=40)
    is_active: bool = True
    subject_ids: list[int] = []


class TeacherPatch(BaseModel):
    last_name: str | None = Field(default=None, max_length=80)
    first_name: str | None = Field(default=None, min_length=1, max_length=80)
    short_name: str | None = Field(default=None, min_length=1, max_length=40)
    is_active: bool | None = None
    subject_ids: list[int] | None = None


class TeacherOut(BaseModel):
    id: int
    last_name: str
    first_name: str
    short_name: str
    full_name: str
    is_active: bool
    subject_ids: list[int]


class RoomIn(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    capacity: int | None = Field(default=None, ge=1, le=500)
    kind: RoomKind = "classroom"


class RoomPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=40)
    capacity: int | None = Field(default=None, ge=1, le=500)
    kind: RoomKind | None = None


class RoomOut(_Orm):
    id: int
    name: str
    capacity: int | None
    kind: str


# ---- анги, хөтөлбөр, календарь ----
class ClassIn(BaseModel):
    year_id: int
    grade: int = Field(ge=1, le=12)
    letter: str = Field(min_length=1, max_length=4)
    period_set_id: int
    homeroom_teacher_id: int | None = None


class ClassPatch(BaseModel):
    grade: int | None = Field(default=None, ge=1, le=12)
    letter: str | None = Field(default=None, min_length=1, max_length=4)
    period_set_id: int | None = None
    homeroom_teacher_id: int | None = None


class ClassOut(BaseModel):
    id: int
    year_id: int
    grade: int
    letter: str
    name: str
    period_set_id: int
    homeroom_teacher_id: int | None


class CurriculumIn(BaseModel):
    class_group_id: int
    subject_id: int
    hours_per_week: int = Field(ge=1, le=20)


class CurriculumPatch(BaseModel):
    hours_per_week: int = Field(ge=1, le=20)


class CurriculumOut(BaseModel):
    id: int
    class_group_id: int
    subject_id: int
    hours_per_week: int
    subject: SubjectOut


class CalendarIn(BaseModel):
    year_id: int
    title: str = Field(min_length=1, max_length=120)
    category: EventCategory = "event"
    start_date: _date
    end_date: _date
    description: str = ""
    applies_to: AppliesTo = "all"
    color: str = Field(default="", pattern=r"^(#[0-9a-fA-F]{6})?$")  # хоосон = ангиллын анхдагч өнгө


class CalendarPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    category: EventCategory | None = None
    start_date: _date | None = None
    end_date: _date | None = None
    description: str | None = None
    applies_to: AppliesTo | None = None
    color: str | None = Field(default=None, pattern=r"^(#[0-9a-fA-F]{6})?$")


class CalendarOut(_Orm):
    id: int
    year_id: int
    title: str
    category: str
    start_date: _date
    end_date: _date
    description: str
    applies_to: str
    color: str


# ---- хуваарь ----
class PeriodRef(BaseModel):
    id: int
    order: int
    start_time: _time
    end_time: _time
    is_break: bool


class TeacherRef(BaseModel):
    id: int
    short_name: str


class RoomRef(BaseModel):
    id: int
    name: str


class ClassRef(BaseModel):
    id: int
    name: str


class LessonOut(BaseModel):
    id: int
    weekday: int
    period: PeriodRef
    subject: SubjectOut
    teacher: TeacherRef
    room: RoomRef | None
    class_group: ClassRef


class GridCell(BaseModel):
    weekday: int = Field(ge=1, le=6)
    period_id: int
    subject_id: int
    teacher_id: int
    room_id: int | None = None


class ConflictOut(BaseModel):
    weekday: int
    period_id: int
    period_order: int
    kind: ConflictKind
    with_class: str
    who: str


class CurriculumCheckOut(BaseModel):
    subject: SubjectOut
    planned: int
    scheduled: int


class StatsOut(BaseModel):
    classes: int
    teachers: int
    rooms: int
    lessons: int
    mismatched_classes: int
