"""
Хуваарийн API (/api/timetable/). Унших нээлттэй, бичих manager.
  GET lessons/?year=&class=|&teacher=|&room=   нэг endpoint, гурван харагдац
  PUT classes/{id}/grid/                       body [{weekday, period_id, subject_id, teacher_id, room_id}]
  GET classes/{id}/curriculum-check/           [{subject, planned, scheduled}]
  GET stats/?year=
  POST lessons/import/                         multipart file, year, dry_run (анхны утга нь true), replace
  GET classes/{id}/timetable.pdf
"""

import asyncio
from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, File, Form, Query, Response, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..common.errors import FieldError
from ..common.media import MAX_BYTES
from .common import DB, Manager, get_or_404, resolve_year
from .grid import save_grid
from .importer import import_workbook, parse_workbook
from .models import ClassGroup, CurriculumEntry, Lesson, Period, Room, Subject, Teacher
from .pdf import build_class_pdf
from .schemas import (
    ClassRef, CurriculumCheckOut, GridCell, LessonOut, PeriodRef, RoomRef, StatsOut, SubjectOut, TeacherRef,
)

router = APIRouter(prefix="/api/timetable", tags=["timetable"])


def subject_out(s: Subject) -> SubjectOut:
    return SubjectOut(id=s.id, name=s.name, short_name=s.short_name, color=s.color)


def lesson_out(l: Lesson) -> LessonOut:
    return LessonOut(
        id=l.id, weekday=l.weekday,
        period=PeriodRef(id=l.period.id, order=l.period.order, start_time=l.period.start_time,
                         end_time=l.period.end_time, is_break=l.period.is_break),
        subject=subject_out(l.subject),
        teacher=TeacherRef(id=l.teacher.id, short_name=l.teacher.short_name),
        room=RoomRef(id=l.room.id, name=l.room.name) if l.room else None,
        class_group=ClassRef(id=l.class_group.id, name=l.class_group.name),
    )


async def lessons_for(db: AsyncSession, year_id: int, class_id: int | None = None,
                      teacher_id: int | None = None, room_id: int | None = None) -> list[LessonOut]:
    q = select(Lesson).join(Lesson.class_group).join(Lesson.period).where(ClassGroup.year_id == year_id)
    if class_id is not None:
        q = q.where(Lesson.class_group_id == class_id)
    if teacher_id is not None:
        q = q.where(Lesson.teacher_id == teacher_id)
    if room_id is not None:
        q = q.where(Lesson.room_id == room_id)
    q = q.order_by(Lesson.weekday, Period.start_time, ClassGroup.grade, ClassGroup.letter)
    return [lesson_out(l) for l in (await db.execute(q)).scalars().all()]


@router.get("/lessons/", response_model=list[LessonOut])
async def lessons_list(db: DB, year: int | None = None,
                       class_: Annotated[int | None, Query(alias="class")] = None,
                       teacher: int | None = None, room: int | None = None):
    y = await resolve_year(db, year)
    if y is None:
        return []
    return await lessons_for(db, y.id, class_, teacher, room)


@router.put("/classes/{id}/grid/", response_model=list[LessonOut])
async def grid_put(id: int, body: list[GridCell], db: DB, _: Manager):
    cg = await get_or_404(db, ClassGroup, id)
    await save_grid(db, cg, body)
    await db.commit()
    return await lessons_for(db, cg.year_id, class_id=cg.id)


def _to_bool(v: str | None, default: bool) -> bool:
    if v is None:
        return default
    return v.strip().lower() in ("1", "true", "yes", "on")


@router.post("/lessons/import/")
async def lessons_import(db: DB, _: Manager, file: Annotated[UploadFile, File()],
                         year: Annotated[int | None, Form()] = None,
                         dry_run: Annotated[str | None, Form()] = None,
                         replace: Annotated[str | None, Form()] = None):
    """
    Excel-ээс хуваарь импортлох. dry_run өгөгдөөгүй бол анхны утга нь true (зөвхөн шалгаад тайлан буцаана,
    юу ч бичихгүй); dry_run=false үед бодитоор хадгална.
    """
    if not (file.filename or "").lower().endswith((".xlsx", ".xlsm", ".xls")):
        raise FieldError("file", "Зөвхөн Excel (.xlsx) файл хүлээн авна.")
    y = await resolve_year(db, year)
    if y is None:
        raise FieldError("year", "Хичээлийн жил олдсонгүй.")
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise FieldError("file", "Файл 10 MB-аас том байж болохгүй.")
    try:
        sheets = parse_workbook(data)
    except Exception as e:  # noqa: BLE001 — calamine олон төрлийн алдаа шиднэ
        raise FieldError("file", f"Файлыг уншиж чадсангүй: {e}") from None
    return await import_workbook(db, sheets, y.id, dry_run=_to_bool(dry_run, True), replace=_to_bool(replace, True))


async def curriculum_check_for(db: AsyncSession, class_id: int) -> list[CurriculumCheckOut]:
    planned = {e.subject_id: e.hours_per_week for e in
               (await db.execute(select(CurriculumEntry).where(CurriculumEntry.class_group_id == class_id))).scalars().all()}
    counts = dict((await db.execute(
        select(Lesson.subject_id, func.count(Lesson.id)).where(Lesson.class_group_id == class_id).group_by(Lesson.subject_id)
    )).all())
    ids = set(planned) | set(counts)
    if not ids:
        return []
    subjects = (await db.execute(select(Subject).where(Subject.id.in_(list(ids))).order_by(Subject.name))).scalars().all()
    return [CurriculumCheckOut(subject=subject_out(s), planned=planned.get(s.id, 0), scheduled=counts.get(s.id, 0))
            for s in subjects]


@router.get("/classes/{id}/curriculum-check/", response_model=list[CurriculumCheckOut])
async def curriculum_check(id: int, db: DB):
    cg = await get_or_404(db, ClassGroup, id)
    return await curriculum_check_for(db, cg.id)


@router.get("/stats/", response_model=StatsOut)
async def stats(db: DB, year: int | None = None):
    y = await resolve_year(db, year)
    if y is None:
        return StatsOut(classes=0, teachers=0, rooms=0, lessons=0, mismatched_classes=0)
    class_ids = (await db.execute(select(ClassGroup.id).where(ClassGroup.year_id == y.id))).scalars().all()
    teachers = (await db.execute(select(func.count(Teacher.id)).where(Teacher.is_active.is_(True)))).scalar_one()
    rooms = (await db.execute(select(func.count(Room.id)))).scalar_one()
    lessons = (await db.execute(
        select(func.count(Lesson.id)).select_from(Lesson).join(Lesson.class_group).where(ClassGroup.year_id == y.id))).scalar_one()
    mismatched = 0
    for cid in class_ids:
        if any(c.planned != c.scheduled for c in await curriculum_check_for(db, cid)):
            mismatched += 1
    return StatsOut(classes=len(class_ids), teachers=teachers, rooms=rooms, lessons=lessons, mismatched_classes=mismatched)


@router.get("/classes/{id}/timetable.pdf")
async def class_pdf(id: int, db: DB):
    cg = await get_or_404(db, ClassGroup, id)
    lessons = (await db.execute(select(Lesson).where(Lesson.class_group_id == cg.id))).scalars().all()
    pdf = await asyncio.to_thread(build_class_pdf, cg, list(cg.period_set.periods), list(lessons))
    filename = quote(f"{cg.name}-хуваарь.pdf")
    return Response(pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f"inline; filename*=UTF-8''{filename}"})
