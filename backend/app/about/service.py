"""Бидний тухай — нийтлэг туслахууд (public ба admin router хоёулаа ашиглана)."""

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from .models import PAGE_DEFAULTS, AboutPage, Department, Leader
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


def page_out(p: AboutPage) -> PageOut:
    return PageOut(intro_title=p.intro_title, intro_html=p.intro_html, stats=[StatItem(**s) for s in (p.stats or [])])


def leader_out(request: Request, l: Leader) -> LeaderOut:
    return LeaderOut(id=l.id, full_name=l.full_name, position=l.position, level=l.level,
                     photo=media_url(request, l.photo) if l.photo else None)


def department_out(d: Department) -> DepartmentOut:
    return DepartmentOut(id=d.id, name=d.name,
                         teachers=[TeacherOut(id=t.id, full_name=t.full_name, role=t.role, is_head=t.is_head) for t in d.teachers])


async def list_leaders(db: AsyncSession) -> list[Leader]:
    return list((await db.execute(select(Leader).order_by(Leader.level, Leader.order, Leader.id))).scalars().all())


async def list_departments(db: AsyncSession) -> list[Department]:
    return list((await db.execute(select(Department).order_by(Department.order, Department.id))).scalars().all())
