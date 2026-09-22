"""
Олимпиадын дүнгийн Excel файлыг уншиж Result мөрүүд болгоно.

Хүлээгдэж буй бүтэц (sheet бүр нэг ангилал):
    A1        : гарчиг
    ...       : "Ангилал:" мөрөнд "VI анги" / "Бага ангийн багш" гэх мэт
    толгой мөр: № | Овог | Нэр | Сургууль | [Шифр] | 1 | 2 | ... | Нийт оноо | Байр | Медаль
    дараа нь  : оролцогч бүр нэг мөр

Sheet-ийн нэр (suragch_VI, bagsh_baga ...) эсвэл "Ангилал:" мөрөөс ангиллыг таньна.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from io import BytesIO

from python_calamine import CalamineWorkbook
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from .models import CATEGORY_LABELS, Result

ROMAN = {"VI": "6", "VII": "7", "VIII": "8", "IX": "9", "X": "10", "XI": "11", "XII": "12"}
SHEET_CATEGORY = {
    "suragch_vi": "6", "suragch_vii": "7", "suragch_viii": "8", "suragch_ix": "9",
    "suragch_x": "10", "suragch_xi": "11", "suragch_xii": "12",
    "bagsh_baga": "teacher_primary", "bagsh_dund": "teacher_secondary",
}
RANKS = {"I", "II", "III"}
MEDALS = {"АЛТ", "МӨНГӨ", "ХҮРЭЛ"}


@dataclass
class SheetResult:
    sheet: str
    category: str | None
    category_label: str
    problems: int = 0
    rows: list[dict] = field(default_factory=list)
    skipped: int = 0
    warnings: list[str] = field(default_factory=list)

    def summary(self) -> dict:
        return {
            "sheet": self.sheet, "category": self.category, "category_label": self.category_label,
            "problems": self.problems, "count": len(self.rows), "skipped": self.skipped,
            "warnings": self.warnings[:20],
        }


@dataclass
class ParsedWorkbook:
    sheets: list[SheetResult]
    detected_date: date | None

    @property
    def total(self) -> int:
        return sum(len(s.rows) for s in self.sheets)


def _text(v) -> str:
    return "" if v is None else str(v).strip()


def _num(v) -> Decimal | None:
    if v is None or v == "" or isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return Decimal(str(v))
    try:
        return Decimal(str(v).strip().replace(",", "."))
    except Exception:
        return None


def _fmt_code(v) -> str:
    n = _num(v)
    if n is not None and n == n.to_integral_value():
        return str(int(n))
    return _text(v)


def detect_category(sheet_name: str, rows: list[list]) -> str | None:
    key = sheet_name.strip().lower()
    if key in SHEET_CATEGORY:
        return SHEET_CATEGORY[key]
    for r in rows[:12]:
        cells = [_text(c) for c in r]
        if cells and cells[0].lower().startswith("ангилал"):
            label = " ".join(c for c in cells[1:] if c).upper()
            m = re.search(r"\b(VI|VII|VIII|IX|X|XI|XII)\b", label)
            if m:
                return ROMAN[m.group(1)]
            if "БАГА" in label:
                return "teacher_primary"
            if "ДУНД" in label:
                return "teacher_secondary"
    return None


def parse_sheet(name: str, rows: list[list], year: int) -> SheetResult:
    category = detect_category(name, rows)
    label = CATEGORY_LABELS[category] if category else "Танигдсангүй"
    res = SheetResult(sheet=name, category=category, category_label=label)
    if not category:
        res.warnings.append("Ангиллыг танисангүй (sheet-ийн нэр эсвэл 'Ангилал:' мөр). Алгасав.")
        return res

    hdr_i = next((i for i, r in enumerate(rows) if r and _text(r[0]) == "№" and "Овог" in [_text(c) for c in r]), None)
    if hdr_i is None:
        res.warnings.append("Толгой мөр (№ | Овог | Нэр ...) олдсонгүй. Алгасав.")
        return res
    hdr = [_text(c) for c in rows[hdr_i]]

    def col(name: str) -> int | None:
        for i, h in enumerate(hdr):
            if h.lower() == name.lower():
                return i
        return None

    c_last, c_first, c_school = col("Овог"), col("Нэр"), col("Сургууль")
    c_code, c_total, c_rank, c_medal = col("Шифр"), col("Нийт оноо"), col("Байр"), col("Медаль")
    problem_cols = [i for i, h in enumerate(hdr) if re.fullmatch(r"\d+(\.0)?", h)]
    res.problems = len(problem_cols)
    if c_first is None:
        res.warnings.append("'Нэр' багана олдсонгүй. Алгасав.")
        return res

    for r_i, r in enumerate(rows[hdr_i + 1:], start=hdr_i + 2):
        def get(i):
            return r[i] if i is not None and i < len(r) else None

        last, first = _text(get(c_last)), _text(get(c_first))
        school = _text(get(c_school))
        scores = [_num(get(i)) for i in problem_cols]
        has_scores = any(s is not None for s in scores)
        if not first and not last and not has_scores:
            res.skipped += 1
            continue
        if not first and not last:
            res.warnings.append(f"{r_i}-р мөр: нэргүй боловч оноотой. Алгасав.")
            res.skipped += 1
            continue

        total = _num(get(c_total))
        if total is None and has_scores:
            total = sum(s for s in scores if s is not None)

        rank_label = _text(get(c_rank)).upper()
        medal = _text(get(c_medal)).upper()
        if rank_label and rank_label not in RANKS:
            res.warnings.append(f"{r_i}-р мөр: 'Байр' утга танигдсангүй: {rank_label!r}")
            rank_label = ""
        if medal and medal not in MEDALS:
            res.warnings.append(f"{r_i}-р мөр: 'Медаль' утга танигдсангүй: {medal!r}")
            medal = ""

        res.rows.append(dict(
            year=year, category=category,
            last_name=last[:80], first_name=(first or "*")[:80], school=school[:160],
            code=_fmt_code(get(c_code))[:30],
            scores=[float(s) if s is not None else None for s in scores],
            score=total, rank_label=rank_label, medal=medal,
        ))
    return res


def detect_date(rows: list[list]) -> date | None:
    for r in rows[:6]:
        for c in r:
            if isinstance(c, datetime):
                return c.date()
            if isinstance(c, date):
                return c
    return None


def parse_workbook(source: bytes, year: int | None = None) -> ParsedWorkbook:
    wb = CalamineWorkbook.from_filelike(BytesIO(source))
    all_rows = {name: wb.get_sheet_by_name(name).to_python(skip_empty_area=False) for name in wb.sheet_names}
    detected = None
    for rows in all_rows.values():
        detected = detect_date(rows)
        if detected:
            break
    if year is None:
        year = detected.year if detected else date.today().year
    return ParsedWorkbook(sheets=[parse_sheet(n, r, year) for n, r in all_rows.items()], detected_date=detected)


async def import_workbook(db: AsyncSession, parsed: ParsedWorkbook, year: int, replace: bool = True) -> dict:
    """Уншсан мөрүүдийг баазад хадгална. replace=True бол тухайн он + ангиллын хуучин мөрүүдийг устгана."""
    deleted = created = 0
    categories = [s.category for s in parsed.sheets if s.category and s.rows]
    if replace and categories:
        res = await db.execute(delete(Result).where(Result.year == year, Result.category.in_(categories)))
        deleted = res.rowcount or 0
    for s in parsed.sheets:
        for row in s.rows:
            db.add(Result(**{**row, "year": year}))
        created += len(s.rows)
    await db.commit()
    return {"deleted": deleted, "created": created}
