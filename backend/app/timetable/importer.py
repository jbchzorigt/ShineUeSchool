"""
Хуваарийн Excel импорт. Sheet бүр нэг бүлэг анги (sheet-ийн нэр "9а").
    Толгой мөр: Цаг | Даваа | Мягмар | Лхагва | Пүрэв | Баасан | [Бямба]   (эхний 10 мөрөөс хайна)
    Эхний багана: цагийн дугаар (1, 2, ...). Нүд: "Математик / Б.Мухулай / 204" (өрөө сонголттой).
Хичээлийг name эсвэл short_name-аар, багшийг short_name-аар, өрөөг name-аар (том/жижиг үсэг ялгахгүй) хайна.
Аль нэг sheet-д алдаа (олдохгүй нэр, давхардал, өөр sheet-ийн ашигласан анги) байвал бүхэлд нь импортлохгүй.

import_workbook нь хоёр үе шаттай:
  1-р үе (бичихгүй): sheet бүрийг уншиж анги/цаг/хичээл/багш/өрөө тогтооно, `replace=False` бол хуучин
     нүдийг нэмж нэгтгэнэ, алдаагүй sheet-үүдийг (report, class, cells) хэлбэрээр хадгална.
  2-р үе: алдаагүй бүх ангийн хуучин хуваарийг НЭГ удаад устгаад, дараа нь sheet тус бүрийг save_grid-ээр
     дараалан бичнэ (save_grid-ийн дотоод устгалт хоосон болно) — ингэснээр нэг файл доторх хоёр ангийн
     хооронд багш/өрөө сольсон ч (жишээ нь 9а ба 1а харилцан солилцвол) хуучин, хоцрогдсон өгөгдөлтэй биш,
     файл доторх шинэ өгөгдлүүдтэй харьцуулж давхардлыг шалгана.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from io import BytesIO

from python_calamine import CalamineWorkbook
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..common.errors import ConflictError, FieldError
from .grid import save_grid
from .models import WEEKDAY_NAMES, ClassGroup, Lesson, Room, Subject, Teacher
from .schemas import GridCell

WEEKDAY_BY_NAME = {v.casefold(): k for k, v in WEEKDAY_NAMES.items()}


@dataclass
class RawCell:
    weekday: int
    order: int
    subject: str
    teacher: str
    room: str


@dataclass
class RawSheet:
    name: str
    cells: list[RawCell] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


@dataclass
class SheetReport:
    sheet: str
    class_name: str | None = None
    count: int = 0
    warnings: list[str] = field(default_factory=list)
    conflicts: list[dict] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.warnings and not self.conflicts

    def summary(self) -> dict:
        return {"sheet": self.sheet, "class_name": self.class_name, "count": self.count,
                "warnings": self.warnings[:30], "conflicts": self.conflicts[:30]}


def _text(v) -> str:
    return "" if v is None else str(v).strip()


def _order(v) -> int | None:
    if v is None or isinstance(v, bool) or v == "":
        return None
    if isinstance(v, (int, float)):
        return int(v) if float(v).is_integer() else None
    s = str(v).strip()
    return int(s) if s.isdigit() else None


def parse_sheet(name: str, rows: list[list]) -> RawSheet:
    sheet = RawSheet(name=name)
    hdr_i, cols = None, {}
    for i, r in enumerate(rows[:10]):
        found = {j: WEEKDAY_BY_NAME[_text(c).casefold()] for j, c in enumerate(r) if _text(c).casefold() in WEEKDAY_BY_NAME}
        if found:
            hdr_i, cols = i, found
            break
    if hdr_i is None:
        sheet.warnings.append("Толгой мөр (Цаг | Даваа | Мягмар ...) олдсонгүй.")
        return sheet
    for r in rows[hdr_i + 1:]:
        first = r[0] if r else None
        order = _order(first)
        if order is None:
            if _text(first):
                sheet.warnings.append(f"'{_text(first)}' — цагийн дугаар биш, мөрийг алгасав.")
            continue
        for j, weekday in cols.items():
            raw = _text(r[j]) if j < len(r) else ""
            if not raw:
                continue
            parts = [p.strip() for p in raw.split("/")]
            if len(parts) < 2 or not parts[0] or not parts[1]:
                sheet.warnings.append(f"{WEEKDAY_NAMES[weekday]}, {order}-р цаг: '{raw}' — 'Хичээл / Багш / Өрөө' хэлбэрээр бичнэ.")
                continue
            sheet.cells.append(RawCell(weekday, order, parts[0], parts[1], parts[2] if len(parts) > 2 else ""))
    return sheet


def parse_workbook(data: bytes) -> list[RawSheet]:
    wb = CalamineWorkbook.from_filelike(BytesIO(data))
    return [parse_sheet(name.strip(), wb.get_sheet_by_name(name).to_python(skip_empty_area=False))
            for name in wb.sheet_names]


async def import_workbook(db: AsyncSession, sheets: list[RawSheet], year_id: int, *, dry_run: bool, replace: bool) -> dict:
    classes = {c.name.casefold(): c for c in
               (await db.execute(select(ClassGroup).where(ClassGroup.year_id == year_id))).scalars().all()}
    subjects: dict[str, Subject] = {}
    for s in (await db.execute(select(Subject))).scalars().all():
        subjects[s.name.casefold()] = s
        subjects.setdefault(s.short_name.casefold(), s)
    teachers = {t.short_name.casefold(): t for t in (await db.execute(select(Teacher))).scalars().all()}
    rooms = {r.name.casefold(): r for r in (await db.execute(select(Room))).scalars().all()}

    reports: list[SheetReport] = []
    claimed: set[int] = set()
    prepared: list[tuple[SheetReport, ClassGroup, list[GridCell]]] = []
    deleted = 0

    # 1-р үе: юу ч бичихгүйгээр sheet бүрийг уншиж шалгана.
    for raw in sheets:
        rep = SheetReport(sheet=raw.name, warnings=list(raw.warnings))
        reports.append(rep)
        cg = classes.get(raw.name.casefold())
        if cg is None:
            rep.warnings.append(f"'{raw.name}' нэртэй анги энэ жилд байхгүй.")
            continue
        if cg.id in claimed:
            rep.warnings.append(f"'{raw.name}' — энэ анги өмнөх sheet-д аль хэдийн байна.")
            continue
        claimed.add(cg.id)
        rep.class_name = cg.name
        periods = {p.order: p for p in cg.period_set.periods}
        cells: dict[tuple[int, int], GridCell] = {}
        for c in raw.cells:
            where = f"{WEEKDAY_NAMES[c.weekday]}, {c.order}-р цаг"
            p, s, t = periods.get(c.order), subjects.get(c.subject.casefold()), teachers.get(c.teacher.casefold())
            r = rooms.get(c.room.casefold()) if c.room else None
            if p is None:
                rep.warnings.append(f"{where}: {c.order}-р цаг энэ ангийн цагийн хүснэгтэд байхгүй.")
                continue
            if s is None:
                rep.warnings.append(f"{where}: '{c.subject}' хичээл олдсонгүй.")
                continue
            if t is None:
                rep.warnings.append(f"{where}: '{c.teacher}' багш олдсонгүй.")
                continue
            if c.room and r is None:
                rep.warnings.append(f"{where}: '{c.room}' өрөө олдсонгүй.")
                continue
            cells[(c.weekday, p.id)] = GridCell(weekday=c.weekday, period_id=p.id, subject_id=s.id, teacher_id=t.id,
                                                room_id=r.id if r else None)
        existing = (await db.execute(select(Lesson).where(Lesson.class_group_id == cg.id))).scalars().all()
        overwritten = sum(1 for l in existing if (l.weekday, l.period_id) in cells)
        if not replace:
            for l in existing:
                cells.setdefault((l.weekday, l.period_id), GridCell(weekday=l.weekday, period_id=l.period_id,
                                                                    subject_id=l.subject_id, teacher_id=l.teacher_id,
                                                                    room_id=l.room_id))
        rep.count = len(cells)
        if rep.warnings:
            continue
        deleted += len(existing) if replace else overwritten
        prepared.append((rep, cg, list(cells.values())))

    # 2-р үе: алдаагүй бүх ангийн хуучин хуваарийг нэг удаад устгаад, sheet тус бүрийг дараалан бичнэ —
    # ингэснээр давхардлыг файл доторх ХАМГИЙН СҮҮЛИЙН (шинэ) өгөгдөлтэй харьцуулна, хуучин мөрчлөлтэй биш.
    created = 0
    if prepared:
        await db.execute(delete(Lesson).where(Lesson.class_group_id.in_([cg.id for _, cg, _ in prepared])))
        for rep, cg, cells in prepared:
            try:
                await save_grid(db, cg, cells)
            except FieldError as e:
                rep.warnings.append(e.message)
            except ConflictError as e:
                rep.conflicts = e.conflicts
            else:
                created += len(cells)

    ok = bool(reports) and all(r.ok for r in reports)
    imported = ok and not dry_run
    if imported:
        await db.commit()
    else:
        await db.rollback()
    return {"year": year_id, "dry_run": dry_run, "imported": imported,
            "total": sum(r.count for r in reports),
            "created": created if imported else 0, "deleted": deleted if imported else 0,
            "sheets": [r.summary() for r in reports]}
