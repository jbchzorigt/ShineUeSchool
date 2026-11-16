"""
Админы нүүр хуудасны тойм — хэрэглэгчийн эрхээр шүүнэ (эрхгүй хэсэг null / хоосон).
  GET /api/dashboard/ → {admission, clubs, facebook, comments}
    admission: идэвхтэй элсэлтийн нэр, бүртгэлтэй хүсэлтийн тоо, бүртгэл нээлттэй эсэх (admissions эрх)
    clubs: идэвхтэй ээлжийн нэр, баталгаажсан бүртгэлийн тоо (clubs эрх)
    facebook: {followers, name} — FB тохируулаагүй бол null (бүх ажилтан)
    comments: сүүлийн 5 сэтгэгдэл (news эрх; нуугдсан ч орно)
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..admissions.models import APP_REGISTERED, AdmissionRound, Applicant
from ..analytics.router import staff
from ..auth.models import User
from ..clubs.models import REG_CONFIRMED, ClubRegistration, ClubRound
from ..db import get_db
from ..news.models import Comment, Post
from .facebook import facebook_followers

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])
DB = Annotated[AsyncSession, Depends(get_db)]
BODY_MAX = 200


async def _admission(db: AsyncSession) -> dict | None:
    rnd = (await db.execute(select(AdmissionRound).where(AdmissionRound.is_active.is_(True)).order_by(AdmissionRound.id.desc()).limit(1))).scalar_one_or_none()
    if rnd is None:
        return None
    n = (await db.execute(select(func.count(Applicant.id)).where(Applicant.round_id == rnd.id, Applicant.status == APP_REGISTERED))).scalar_one()
    return {"round": rnd.name, "applicants": n, "registration_open": rnd.registration_open}


async def _clubs(db: AsyncSession) -> dict | None:
    rnd = (await db.execute(select(ClubRound).where(ClubRound.is_active.is_(True)).limit(1))).scalar_one_or_none()
    if rnd is None:
        return None
    n = (await db.execute(select(func.count(ClubRegistration.id)).where(ClubRegistration.round_id == rnd.id, ClubRegistration.status == REG_CONFIRMED))).scalar_one()
    return {"round": rnd.name, "registrations": n}


async def _comments(db: AsyncSession) -> list[dict]:
    rows = (await db.execute(select(Comment, Post.title, Post.slug).join(Post, Post.id == Comment.post_id)
                             .order_by(Comment.created_at.desc(), Comment.id.desc()).limit(5))).all()
    out = []
    for c, title, slug in rows:
        body = " ".join(c.body.split())
        out.append({"id": c.id, "author_name": c.author_name or "Зочин", "body": body if len(body) <= BODY_MAX else body[:BODY_MAX] + "…",
                    "created_at": c.created_at.isoformat(), "is_hidden": c.is_hidden, "post_title": title, "post_slug": slug})
    return out


@router.get("/")
async def dashboard(db: DB, user: Annotated[User, Depends(staff)]):
    return {
        "admission": await _admission(db) if user.can("admissions") else None,
        "clubs": await _clubs(db) if user.can("clubs") else None,
        "facebook": await facebook_followers(),
        "comments": await _comments(db) if user.can("news") else [],
    }
