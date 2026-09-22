"""
Нэвтрэлтийн API.
  POST /api/auth/token/          {username, password} → {access, refresh}
  POST /api/auth/token/refresh/  {refresh}            → {access, refresh}
  GET  /api/auth/me/             Bearer               → хэрэглэгчийн мэдээлэл
"""

import asyncio
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..common.errors import FieldError
from ..db import get_db
from .deps import current_user, require_superuser
from .models import ROLE_CODES, Role, User
from .schemas import LoginIn, MeOut, RefreshIn, RoleOut, TokenPair, UserIn, UserOut, UserPatch
from .security import create_token, decode_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

Super = Annotated[User, Depends(require_superuser)]


def _pair(user: User) -> TokenPair:
    return TokenPair(access=create_token(user.id, "access"), refresh=create_token(user.id, "refresh"))


def me_out(user: User) -> MeOut:
    return MeOut(id=user.id, username=user.username, full_name=user.full_name or user.username,
                 email=user.email, is_staff=user.is_staff, is_superuser=user.is_superuser, roles=user.role_codes)


@router.post("/token/", response_model=TokenPair)
async def login(body: LoginIn, db: Annotated[AsyncSession, Depends(get_db)]):
    user = (await db.execute(select(User).where(User.username == body.username))).scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Нэвтрэх нэр эсвэл нууц үг буруу байна.")
    ok = await asyncio.to_thread(verify_password, body.password, user.password_hash)
    if not ok:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Нэвтрэх нэр эсвэл нууц үг буруу байна.")
    return _pair(user)


@router.post("/token/refresh/", response_model=TokenPair)
async def refresh(body: RefreshIn, db: Annotated[AsyncSession, Depends(get_db)]):
    try:
        payload = decode_token(body.refresh)
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh токен хүчингүй.")
    if payload.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh токен шаардлагатай.")
    user = await db.get(User, int(payload["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Хэрэглэгч олдсонгүй.")
    return _pair(user)


@router.get("/me/", response_model=MeOut)
async def me(user: Annotated[User, Depends(current_user)]):
    return me_out(user)


def user_out(u: User) -> UserOut:
    return UserOut(**me_out(u).model_dump(), is_active=u.is_active)


async def _roles(db: AsyncSession, codes: list[str]) -> list[Role]:
    """Хүчинтэй кодуудад тохирох Role мөрүүдийг DB-ээс авна; байхгүй бол үүсгэнэ (ROLE_CODES бол цорын ганц эх сурвалж)."""
    codes = list(dict.fromkeys(codes))
    bad = [c for c in codes if c not in ROLE_CODES]
    if bad:
        raise FieldError("roles", f"Танигдаагүй эрх: {', '.join(bad)}")
    if not codes:
        return []
    existing = {r.code: r for r in (await db.execute(select(Role).where(Role.code.in_(codes)))).scalars().all()}
    roles = []
    for code in codes:
        role = existing.get(code)
        if role is None:
            role = Role(code=code, name=ROLE_CODES[code])
            db.add(role)
        roles.append(role)
    return roles


@router.get("/roles/", response_model=list[RoleOut])
async def roles_list(_: Super):
    """ROLE_CODES бол боломжит эрхийн жагсаалтын эх сурвалж (Role хүснэгт зөвхөн user-role холбоосын хувьд байдаг)."""
    return [RoleOut(code=code, name=name) for code, name in ROLE_CODES.items()]


@router.get("/users/", response_model=list[UserOut])
async def users_list(db: Annotated[AsyncSession, Depends(get_db)], _: Super):
    return [user_out(u) for u in (await db.execute(select(User).order_by(User.username))).scalars().all()]


@router.post("/users/", response_model=UserOut, status_code=201)
async def users_create(body: UserIn, db: Annotated[AsyncSession, Depends(get_db)], _: Super):
    u = User(username=body.username, password_hash=hash_password(body.password), full_name=body.full_name,
             email=body.email, is_active=body.is_active, is_superuser=body.is_superuser,
             roles=await _roles(db, body.roles))
    db.add(u)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise FieldError("username", "Ийм нэвтрэх нэртэй хэрэглэгч байна.")
    await db.commit()
    return user_out(u)


@router.patch("/users/{id}/", response_model=UserOut)
async def users_patch(id: int, body: UserPatch, db: Annotated[AsyncSession, Depends(get_db)], me: Super):
    u = await db.get(User, id)
    if u is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    data = body.model_dump(exclude_unset=True)
    if id == me.id and (data.get("is_superuser") is False or data.get("is_active") is False):
        raise FieldError("non_field_errors", "Өөрийн эрхийг хасаж болохгүй.")
    password = data.pop("password", None)
    if password:
        u.password_hash = hash_password(password)
    roles = data.pop("roles", None)
    if roles is not None:
        u.roles = await _roles(db, roles)
    for k, v in data.items():
        setattr(u, k, v)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise FieldError("username", "Ийм нэвтрэх нэртэй хэрэглэгч байна.")
    await db.commit()
    return user_out(u)


@router.delete("/users/{id}/", status_code=204)
async def users_delete(id: int, db: Annotated[AsyncSession, Depends(get_db)], me: Super):
    if id == me.id:
        raise FieldError("non_field_errors", "Өөрийгөө устгаж болохгүй.")
    u = await db.get(User, id)
    if u is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    await db.delete(u)
    await db.commit()
