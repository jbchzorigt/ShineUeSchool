"""Зочны JWT (type=visitor) ба dependency-ууд."""

from datetime import UTC, datetime, timedelta
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.security import decode_token
from ..config import settings
from ..db import get_db
from .models import Visitor


def create_visitor_token(visitor_id: int) -> str:
    now = datetime.now(UTC)
    return jwt.encode({"sub": str(visitor_id), "type": "visitor", "iat": now, "exp": now + timedelta(days=settings.visitor_ttl_days)},
                      settings.secret_key, algorithm="HS256")


async def optional_visitor(request: Request, db: Annotated[AsyncSession, Depends(get_db)]) -> Visitor | None:
    h = request.headers.get("authorization", "")
    if not h.lower().startswith("bearer "):
        return None
    try:
        payload = decode_token(h[7:].strip())
    except jwt.PyJWTError:
        return None
    if payload.get("type") != "visitor":
        return None
    v = await db.get(Visitor, int(payload["sub"]))
    if v is None:
        return None
    if v.is_blocked:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Таны хандалт хаагдсан байна.")
    return v


async def current_visitor(v: Annotated[Visitor | None, Depends(optional_visitor)]) -> Visitor:
    if v is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Facebook-ээр нэвтэрнэ үү.")
    return v
