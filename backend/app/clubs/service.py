"""Дугуйлангийн нийтлэг логик: имэйл, код, token, төлөв, гаралтын схем."""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from .models import REG_CONFIRMED, Club, ClubRegistration, ClubRound
from .schemas import ClubAdminOut, ClubOut, ImageOut, QuotaOut

TOKEN_SCOPE = "club-reg"


def normalize_email(s: str) -> str:
    return s.strip().lower()


def check_domain(email: str) -> bool:
    return email.endswith("@" + settings.club_email_domain.lower()) and email.count("@") == 1 and len(email.split("@")[0]) > 0


def new_code() -> str:
    return f"{secrets.randbelow(10**6):06d}"


def hash_code(email: str, code: str) -> str:
    return hashlib.sha256(f"{settings.secret_key}:{email}:{code}".encode()).hexdigest()


def create_reg_token(email: str) -> str:
    now = datetime.now(UTC)
    payload = {"sub": email, "scope": TOKEN_SCOPE, "iat": now,
               "exp": now + timedelta(minutes=settings.club_token_ttl_minutes)}
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def decode_reg_token(token: str) -> str:
    """Имэйл буцаана; буруу/хугацаа дууссан/scope зөрсөн бол 401."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    except jwt.PyJWTError:
        payload = None
    if not payload or payload.get("scope") != TOKEN_SCOPE or not payload.get("sub"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Баталгаажуулалтын хугацаа дууссан. Кодоо дахин авна уу")
    return str(payload["sub"])


def quota_map(club) -> dict[int, int]:
    """{"3": 8} → {3: 8}."""
    return {int(g): int(n) for g, n in (club.quotas or {}).items()}


def club_state(club, taken_g: dict[int, int], now: datetime) -> str:
    """upcoming → closed → full (бүх анги дүүрсэн) → open."""
    if now < club.registration_start:
        return "upcoming"
    if now >= club.registration_end:
        return "closed"
    qm = quota_map(club)
    # квотгүй дугуйлан бүртгэл авахгүй тул "дүүрсэн"
    if not qm or all(taken_g.get(g, 0) >= cap for g, cap in qm.items()):
        return "full"
    return "open"


async def taken_by_grade(db: AsyncSession, club_ids: list[int]) -> dict[int, dict[int, int]]:
    """club_id → {анги → баталгаажсан бүртгэлийн тоо}."""
    if not club_ids:
        return {}
    rows = (await db.execute(
        select(ClubRegistration.club_id, ClubRegistration.grade, func.count(ClubRegistration.id))
        .where(ClubRegistration.club_id.in_(club_ids), ClubRegistration.status == REG_CONFIRMED)
        .group_by(ClubRegistration.club_id, ClubRegistration.grade)
    )).all()
    out: dict[int, dict[int, int]] = {}
    for cid, g, n in rows:
        out.setdefault(cid, {})[int(g)] = int(n)
    return out


def quota_rows(club, taken_g: dict[int, int]) -> list[QuotaOut]:
    rows = []
    for g, cap in sorted(quota_map(club).items()):
        t = taken_g.get(g, 0)
        rows.append(QuotaOut(grade=g, capacity=cap, taken=t, slots_left=max(cap - t, 0), full=t >= cap))
    return rows


async def active_round(db: AsyncSession) -> ClubRound | None:
    return (await db.execute(select(ClubRound).where(ClubRound.is_active.is_(True)))).scalar_one_or_none()


async def find_confirmed(db: AsyncSession, round_id: int, email: str) -> ClubRegistration | None:
    return (await db.execute(
        select(ClubRegistration).where(ClubRegistration.round_id == round_id, ClubRegistration.email == email,
                                       ClubRegistration.status == REG_CONFIRMED)
    )).scalar_one_or_none()


def media_url(request: Request, rel: str) -> str:
    if settings.media_base_url:
        return f"{settings.media_base_url.rstrip('/')}/media/{rel}"
    return f"{request.base_url}media/{rel}"


def _base(request: Request, club: Club, taken_g: dict[int, int], now: datetime) -> dict:
    rows = quota_rows(club, taken_g)
    return dict(
        id=club.id, name=club.name, description=club.description, grades=list(club.grades),
        capacity=sum(r.capacity for r in rows), taken=sum(r.taken for r in rows), slots_left=sum(r.slots_left for r in rows),
        state=club_state(club, taken_g, now), quotas=rows,
        is_paid=club.is_paid, fee=club.fee, fee_note=club.fee_note,
        registration_start=club.registration_start, registration_end=club.registration_end,
        images=[ImageOut(id=i.id, url=media_url(request, i.file), order=i.order) for i in club.images],
    )


def club_out(request: Request, club: Club, taken_g: dict[int, int], now: datetime) -> ClubOut:
    return ClubOut(**_base(request, club, taken_g, now))


def club_admin_out(request: Request, club: Club, taken_g: dict[int, int], now: datetime) -> ClubAdminOut:
    return ClubAdminOut(**_base(request, club, taken_g, now), is_published=club.is_published, order=club.order,
                        round_id=club.round_id)
