"""Эрхийн dependency-ууд."""

from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from .models import User
from .security import decode_token


def _bearer(request: Request) -> str | None:
    h = request.headers.get("authorization", "")
    if h.lower().startswith("bearer "):
        return h[7:].strip()
    return None


async def optional_user(request: Request, db: Annotated[AsyncSession, Depends(get_db)]) -> User | None:
    token = _bearer(request)
    if not token:
        return None
    try:
        payload = decode_token(token)
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Токен хүчингүй эсвэл хугацаа дууссан.")
    if payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Access токен шаардлагатай.")
    user = await db.get(User, int(payload["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Хэрэглэгч олдсонгүй.")
    return user


async def current_user(user: Annotated[User | None, Depends(optional_user)]) -> User:
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Нэвтрэх шаардлагатай.")
    return user


async def require_staff(user: Annotated[User, Depends(current_user)]) -> User:
    if not user.is_staff:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Энэ үйлдэлд эрх хүрэхгүй.")
    return user


def require_role(code: str):
    async def _dep(user: Annotated[User, Depends(current_user)]) -> User:
        if user.is_superuser or code in user.role_codes:
            return user
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Энэ үйлдэлд эрх хүрэхгүй.")
    return _dep


async def require_superuser(user: Annotated[User, Depends(current_user)]) -> User:
    if not user.is_superuser:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Зөвхөн superuser.")
    return user
