"""Бидний тухай — нийтлэг туслахууд (public ба admin router хоёулаа ашиглана)."""

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..common.i18n import Lang, localized
from ..config import settings
from .models import PAGE_DEFAULTS, AboutPage, Department, DeptTeacher, Leader
from .schemas import DepartmentOut, LeaderOut, PageOut, StatItem, TeacherOut


def media_url(request: Request, rel: str) -> str:
    if settings.media_base_url:
        return f"{settings.media_base_url.rstrip('/')}/media/{rel}"
    return f"{request.base_url}media/{rel}"


async def get_page(db: AsyncSession) -> AboutPage:
    """Нэг мөрт тохиргоо; байхгүй бол анхдагчаар үүсгэнэ (зэрэг үүсгэх оролдлогод хоёр дахь нь дахин уншина)."""
    p = await db.get(AboutPage, 1)
    if p is not None:
        return p
    db.add(AboutPage(id=1, **PAGE_DEFAULTS))
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
    return await db.get(AboutPage, 1)  # type: ignore[return-value]


def _stat(s: dict, lang: Lang) -> StatItem:
    en = s.get("label_en") or ""
    return StatItem(value=s["value"], label=localized(s["label"], en, lang), label_en=en)


def page_out(p: AboutPage, lang: Lang = "mn") -> PageOut:
    return PageOut(intro_title=localized(p.intro_title, p.intro_title_en, lang), intro_title_en=p.intro_title_en,
                   intro_html=localized(p.intro_html, p.intro_html_en, lang), intro_html_en=p.intro_html_en,
                   stats=[_stat(s, lang) for s in (p.stats or [])])


def leader_out(request: Request, l: Leader, lang: Lang = "mn") -> LeaderOut:
    return LeaderOut(id=l.id, full_name=l.full_name, position=localized(l.position, l.position_en, lang), position_en=l.position_en,
                     level=l.level, photo=media_url(request, l.photo) if l.photo else None)


def teacher_out(t: DeptTeacher, lang: Lang = "mn") -> TeacherOut:
    return TeacherOut(id=t.id, full_name=t.full_name, role=localized(t.role, t.role_en, lang), role_en=t.role_en, is_head=t.is_head)


def department_out(d: Department, lang: Lang = "mn") -> DepartmentOut:
    return DepartmentOut(id=d.id, name=localized(d.name, d.name_en, lang), name_en=d.name_en,
                         teachers=[teacher_out(t, lang) for t in d.teachers])


async def list_leaders(db: AsyncSession) -> list[Leader]:
    return list((await db.execute(select(Leader).order_by(Leader.level, Leader.order, Leader.id))).scalars().all())


async def list_departments(db: AsyncSession) -> list[Department]:
    return list((await db.execute(select(Department).order_by(Department.order, Department.id))).scalars().all())
