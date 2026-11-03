"""Элсэлтийн нийтлэг логик: ээлжийн төлөв, элсэгчийн код, имэйл баталгаажуулалтын token."""

import re
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from .models import APP_REGISTERED, AdmissionRound, Applicant
from .schemas import RoundAdminOut, RoundPublic, SectionAdmin, SectionPublic

TOKEN_SCOPE = "admission-app"
TOKEN_MINUTES = 30          # маягт урт тул дугуйлангийнхаас (15 мин) урт
# Андуурагдах тэмдэгтгүй (0/O, 1/I/L) — утсаар хэлэх, гараар бичихэд хялбар
CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
CODE_LEN = 5
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def normalize_email(s: str) -> str:
    return s.strip().lower()


def valid_email(email: str) -> bool:
    return bool(EMAIL_RE.fullmatch(email)) and len(email) <= 254


def normalize_code(s: str) -> str:
    """Хайлт/импортод: зайг хасаад том үсэг болгоно ("su27 - 7kq4m" → "SU27-7KQ4M")."""
    return re.sub(r"\s+", "", s or "").upper()


def _live(enabled: bool, deadline: datetime | None, now: datetime) -> bool:
    return bool(enabled and deadline is not None and now < deadline)


def registration_live(rnd: AdmissionRound, now: datetime) -> bool:
    """Шалгалтын бүртгэл сайтад харагдаж, бүртгэл авч байгаа эсэх."""
    return bool(rnd.is_active) and _live(rnd.registration_open, rnd.registration_deadline, now)


def results_live(rnd: AdmissionRound, now: datetime) -> bool:
    """Шалгалтын дүн сайтад нийтлэгдэж байгаа эсэх."""
    return bool(rnd.is_active) and _live(rnd.results_published, rnd.results_deadline, now)


async def expire_sections(db: AsyncSession) -> None:
    """Хугацаа өнгөрсөн хэсгийн товчийг баазад унтраана — админы самбарт унтарсан харагдаж, админ дахин асаах хүртэл
    сайтаас нуугдана. Олон нийт ба админы endpoint бүрийн эхэнд дуудагддаг тул тусдаа cron хэрэггүй; сайтын харагдах
    эсэх нь *_live()-аар цагийг шууд шалгадаг тул энэ дуудагдахаас өмнө ч хугацаа өнгөрсөн хэсэг хэзээ ч харагдахгүй."""
    now = datetime.now(UTC)
    r1 = await db.execute(update(AdmissionRound).where(
        AdmissionRound.registration_open.is_(True), AdmissionRound.registration_deadline <= now).values(registration_open=False))
    r2 = await db.execute(update(AdmissionRound).where(
        AdmissionRound.results_published.is_(True), AdmissionRound.results_deadline <= now).values(results_published=False))
    if r1.rowcount or r2.rowcount:
        await db.commit()


async def active_round(db: AsyncSession) -> AdmissionRound | None:
    await expire_sections(db)
    return (await db.execute(select(AdmissionRound).where(AdmissionRound.is_active.is_(True)))).scalar_one_or_none()


async def new_applicant_code(db: AsyncSession, prefix: str) -> str:
    """PREFIX-XXXXX, давхардахгүй (31^5 ≈ 28 сая хувилбар)."""
    while True:
        code = f"{prefix}-{''.join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LEN))}"
        if (await db.execute(select(Applicant.id).where(Applicant.code == code))).first() is None:
            return code


def create_app_token(email: str) -> str:
    now = datetime.now(UTC)
    payload = {"sub": email, "scope": TOKEN_SCOPE, "iat": now, "exp": now + timedelta(minutes=TOKEN_MINUTES)}
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def decode_app_token(token: str) -> str:
    """Имэйл буцаана; буруу/хугацаа дууссан/scope зөрсөн бол 401."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    except jwt.PyJWTError:
        payload = None
    if not payload or payload.get("scope") != TOKEN_SCOPE or not payload.get("sub"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Баталгаажуулалтын хугацаа дууссан. Кодоо дахин авна уу")
    return str(payload["sub"])


def round_public(rnd: AdmissionRound, now: datetime) -> RoundPublic:
    """Унтраалттай хэсгийн хугацааг ч нуух шаардлагагүй ч харуулахгүй (open=False бол deadline=None)."""
    reg, res = registration_live(rnd, now), results_live(rnd, now)
    return RoundPublic(
        id=rnd.id, name=rnd.name, grades=list(rnd.grades), test_info=rnd.test_info if reg else "",
        registration=SectionPublic(open=reg, deadline=rnd.registration_deadline if reg else None),
        results=SectionPublic(open=res, deadline=rnd.results_deadline if res else None),
    )


async def round_admin_out(db: AsyncSession, rnd: AdmissionRound) -> RoundAdminOut:
    now = datetime.now(UTC)
    base = select(func.count(Applicant.id)).where(Applicant.round_id == rnd.id, Applicant.status == APP_REGISTERED)
    applicants = (await db.execute(base)).scalar_one()
    results = (await db.execute(base.where(Applicant.result.is_not(None)))).scalar_one()

    def section(enabled: bool, deadline: datetime | None) -> SectionAdmin:
        return SectionAdmin(enabled=enabled, deadline=deadline, expired=deadline is not None and deadline <= now)

    return RoundAdminOut(
        id=rnd.id, name=rnd.name, code_prefix=rnd.code_prefix, grades=list(rnd.grades), test_info=rnd.test_info,
        is_active=rnd.is_active, registration=section(rnd.registration_open, rnd.registration_deadline),
        results=section(rnd.results_published, rnd.results_deadline), results_published_at=rnd.results_published_at,
        applicants_count=int(applicants), results_count=int(results), created_at=rnd.created_at,
    )
