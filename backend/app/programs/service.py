"""Хөтөлбөр — нийтлэг туслахууд (public ба admin router хоёулаа)."""

from fastapi import HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import noload

from ..config import settings
from ..news.slug import slugify
from .models import Program, ProgramWork, Scholarship
from .schemas import ProgramAdmin, ProgramAdminDetail, ProgramCard, ProgramDetail, ScholarshipOut, WorkOut


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


def _card(request: Request, p: Program) -> dict:
    return dict(id=p.id, slug=p.slug, name=p.name, badge=p.badge, summary=p.summary, cover_image=_url(request, p.cover_image),
                grade_from=p.grade_from, grade_to=p.grade_to)


def card_out(request: Request, p: Program) -> ProgramCard:
    return ProgramCard(**_card(request, p))


def work_out(request: Request, w: ProgramWork) -> WorkOut:
    return WorkOut(id=w.id, image=media_url(request, w.image), title=w.title, student=w.student, caption=w.caption)


def scholarship_out(request: Request, s: Scholarship) -> ScholarshipOut:
    return ScholarshipOut(id=s.id, student_name=s.student_name, photo=_url(request, s.photo), university=s.university, year=s.year, amount_usd=s.amount_usd)


def detail_out(request: Request, p: Program) -> ProgramDetail:
    return ProgramDetail(**_card(request, p), body_html=p.body_html,
                         works=[work_out(request, w) for w in p.works],
                         scholarships=[scholarship_out(request, s) for s in p.scholarships],
                         scholarship_total_usd=sum(s.amount_usd for s in p.scholarships), scholarship_count=len(p.scholarships))


def admin_out(request: Request, p: Program) -> ProgramAdmin:
    return ProgramAdmin(**_card(request, p), body_html=p.body_html, is_published=p.is_published, order=p.order,
                        works_count=len(p.works), scholarships_count=len(p.scholarships))


def admin_detail_out(request: Request, p: Program) -> ProgramAdminDetail:
    return ProgramAdminDetail(**admin_out(request, p).model_dump(),
                              works=[work_out(request, w) for w in p.works], scholarships=[scholarship_out(request, s) for s in p.scholarships])
