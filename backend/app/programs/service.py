"""Хөтөлбөр — нийтлэг туслахууд (public ба admin router хоёулаа)."""

from fastapi import HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import noload

from ..common.errors import FieldError
from ..common.i18n import Lang, localized
from ..config import settings
from ..news.slug import slugify
from .models import Program, ProgramWork, Scholarship
from .schemas import (OutcomeRow, OutcomesIn, RadarIn, ProgramAdmin, ProgramAdminDetail, ProgramCard, ProgramDetail, ScholarshipOut, SubjectOut,
                      SubjectRow, SubjectsIn, WorkOut)


def media_url(request: Request, rel: str) -> str:
    if settings.media_base_url:
        return f"{settings.media_base_url.rstrip('/')}/media/{rel}"
    return f"{request.base_url}media/{rel}"


def _url(request: Request, rel: str | None) -> str | None:
    return media_url(request, rel) if rel else None


async def unique_slug(db: AsyncSession, name: str) -> str:
    """slugify(name), давхардвал -2, -3 … (мэдээний unique_slug-тай ижил, Program дээр)."""
    base = slugify(name)
    if base == "post":
        base = "program"
    candidate, n = base, 1
    while (await db.execute(select(Program.id).where(Program.slug == candidate))).first() is not None:
        n += 1
        candidate = f"{base}-{n}"
    return candidate


async def get_or_404(db: AsyncSession, model, id: int):
    obj = await db.get(model, id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    return obj


async def list_programs(db: AsyncSession, published_only: bool) -> list[Program]:
    q = select(Program).order_by(Program.order, Program.id)
    if published_only:
        q = q.where(Program.is_published.is_(True)).options(noload(Program.works), noload(Program.scholarships))
    return list((await db.execute(q)).scalars().all())


def _card(request: Request, p: Program, lang: Lang = "mn") -> dict:
    return dict(id=p.id, slug=p.slug, name=localized(p.name, p.name_en, lang), name_en=p.name_en, badge=p.badge,
                summary=localized(p.summary, p.summary_en, lang), summary_en=p.summary_en, cover_image=_url(request, p.cover_image),
                grade_from=p.grade_from, grade_to=p.grade_to)


def card_out(request: Request, p: Program, lang: Lang = "mn") -> ProgramCard:
    return ProgramCard(**_card(request, p, lang))


def work_out(request: Request, w: ProgramWork, lang: Lang = "mn") -> WorkOut:
    return WorkOut(id=w.id, image=media_url(request, w.image), title=localized(w.title, w.title_en, lang), title_en=w.title_en,
                   student=w.student, caption=localized(w.caption, w.caption_en, lang), caption_en=w.caption_en)


def scholarship_out(request: Request, s: Scholarship) -> ScholarshipOut:
    return ScholarshipOut(id=s.id, student_name=s.student_name, photo=_url(request, s.photo), university=s.university, year=s.year, amount_usd=s.amount_usd)


def detail_out(request: Request, p: Program, lang: Lang = "mn") -> ProgramDetail:
    return ProgramDetail(**_card(request, p, lang), body_html=localized(p.body_html, p.body_html_en, lang), body_html_en=p.body_html_en,
                         radar=radar_out(p), outcomes=outcomes_out(p), subjects=subjects_out(p, lang), works=[work_out(request, w, lang) for w in p.works],
                         scholarships=[scholarship_out(request, s) for s in p.scholarships],
                         scholarship_total_usd=sum(s.amount_usd for s in p.scholarships), scholarship_count=len(p.scholarships))


def admin_out(request: Request, p: Program) -> ProgramAdmin:
    return ProgramAdmin(**_card(request, p), body_html=p.body_html, body_html_en=p.body_html_en, is_published=p.is_published, order=p.order,
                        works_count=len(p.works), scholarships_count=len(p.scholarships))


def admin_detail_out(request: Request, p: Program) -> ProgramAdminDetail:
    return ProgramAdminDetail(**admin_out(request, p).model_dump(), radar=radar_out(p), outcomes=outcomes_out(p),
                              subjects=[SubjectRow(**s) for s in (p.subjects or [])],
                              works=[work_out(request, w) for w in p.works], scholarships=[scholarship_out(request, s) for s in p.scholarships])


def radar_out(p: Program) -> RadarIn | None:
    r = p.radar or {}
    return RadarIn(**r) if r.get("subjects") else None


RADAR_MAX_SUBJECTS, RADAR_MAX_SERIES, RADAR_MAX_VALUE = 12, 5, 1000


def _num(v: float | None) -> float | None:
    return None if v is None else round(v, 1)


def clean_radar(data: RadarIn) -> dict:
    """Онооны графикийн шалгалт: хичээл 3–12 (давхардалгүй), цуврал 1–5 (нэр давхардалгүй), утга бүр хичээлийн тоотой тэнцүү, 0–1000.
    Тухайн онд өгөгдөлгүй нүд null байж болно, гэхдээ хичээл бүр дор хаяж нэг оноотой. `total` (нийт дундаж) сонголттой.
    subjects, series хоёулаа хоосон → {} (график арилна)."""
    subjects = [" ".join(x.split()) for x in data.subjects]
    subjects = [x for x in subjects if x]
    series = [(" ".join(sr.name.split()), sr.values, sr.total) for sr in data.series]
    if not subjects and not any(n or v for n, v, _ in series):
        return {}
    if not 3 <= len(subjects) <= RADAR_MAX_SUBJECTS:
        raise FieldError("subjects", f"Хичээл 3–{RADAR_MAX_SUBJECTS} байна.")
    if len({x.casefold() for x in subjects}) != len(subjects):
        raise FieldError("subjects", "Хичээлийн нэр давхардаж байна.")
    if not 1 <= len(series) <= RADAR_MAX_SERIES:
        raise FieldError("series", f"Цуврал 1–{RADAR_MAX_SERIES} байна.")
    names = [n for n, _, _ in series]
    if any(not n for n in names):
        raise FieldError("series", "Цуврал бүрт нэр (жил) бичнэ үү.")
    if len({n.casefold() for n in names}) != len(names):
        raise FieldError("series", "Цувралын нэр давхардаж байна.")
    out = []
    for name, values, total in series:
        if len(values) != len(subjects):
            raise FieldError("series", "Цуврал бүрт хичээл бүрийн нүд байх ёстой.")
        if any(v is not None and not 0 <= v <= RADAR_MAX_VALUE for v in [*values, total]):
            raise FieldError("series", f"Оноо 0–{RADAR_MAX_VALUE} байна.")
        row = {"name": name, "values": [_num(v) for v in values]}
        if total is not None:
            row["total"] = _num(total)
        out.append(row)
    for i, subject in enumerate(subjects):
        if all(row["values"][i] is None for row in out):
            raise FieldError("series", f"«{subject}» хичээлд дор хаяж нэг оноо оруулна уу.")
    return {"title": data.title.strip(), "subjects": subjects, "series": out}


OUTCOMES_MAX_ROWS, OUTCOMES_MAX_GRADUATES = 30, 10000


def outcomes_out(p: Program) -> list[OutcomeRow]:
    return [OutcomeRow(**r) for r in (p.outcomes or [])]


def clean_outcomes(data: OutcomesIn) -> list[dict]:
    """Төгсөлтийн үр дүн: мөр ≤30, он 2000–2100 давхардалгүй, төгссөн 1–10000, гадаадад элссэн 0…төгссөн. Он өсөхөөр эрэмбэлнэ; хоосон → []."""
    rows = data.rows
    if len(rows) > OUTCOMES_MAX_ROWS:
        raise FieldError("rows", f"Хамгийн ихдээ {OUTCOMES_MAX_ROWS} он.")
    years = [r.year for r in rows]
    if any(not 2000 <= y <= 2100 for y in years):
        raise FieldError("rows", "Он 2000–2100 байна.")
    if len(set(years)) != len(years):
        raise FieldError("rows", "Он давхардаж байна.")
    for r in rows:
        if not 1 <= r.graduates <= OUTCOMES_MAX_GRADUATES:
            raise FieldError("rows", f"{r.year}: төгссөн тоо 1–{OUTCOMES_MAX_GRADUATES} байна.")
        if not 0 <= r.abroad <= r.graduates:
            raise FieldError("rows", f"{r.year}: гадаадад элссэн тоо 0-ээс төгссөн тоо хүртэл байна.")
    return [r.model_dump() for r in sorted(rows, key=lambda r: r.year)]


SUBJECTS_MAX_ROWS = 40


def subjects_out(p: Program, lang: Lang = "mn") -> list[SubjectOut]:
    return [SubjectOut(key=s["name"], group=localized(s.get("group", ""), s.get("group_en", ""), lang), name=localized(s["name"], s.get("name_en", ""), lang),
                       name_en=s.get("name_en", ""), tag=s.get("tag", ""), description=localized(s.get("description", ""), s.get("description_en", ""), lang))
            for s in (p.subjects or [])]


def clean_subjects(data: SubjectsIn) -> list[dict]:
    """Хичээлүүд: ≤40 мөр, нэр заавал ба давхардалгүй (том жижиг үсэг ялгахгүй), хоосон зай цэгцэлнэ (тайлбарт мөр шилжилт хадгална).
    Админы оруулсан эрэмбээр хадгална; хоосон → []."""
    rows = data.rows
    if len(rows) > SUBJECTS_MAX_ROWS:
        raise FieldError("rows", f"Хамгийн ихдээ {SUBJECTS_MAX_ROWS} хичээл.")
    line = lambda v: " ".join(v.split())                                           # noqa: E731
    text = lambda v: "\n".join(line(x) for x in v.strip().splitlines()).strip()   # noqa: E731
    out = []
    for r in rows:
        name = line(r.name)
        if not name:
            raise FieldError("rows", "Хичээл бүрт нэр бичнэ үү.")
        out.append({"group": line(r.group), "group_en": line(r.group_en), "name": name, "name_en": line(r.name_en), "tag": line(r.tag),
                    "description": text(r.description), "description_en": text(r.description_en)})
    names = [s["name"].casefold() for s in out]
    if len(set(names)) != len(names):
        dup = next(s["name"] for s in out if names.count(s["name"].casefold()) > 1)
        raise FieldError("rows", f"«{dup}» хичээл давхардаж байна.")
    return out
