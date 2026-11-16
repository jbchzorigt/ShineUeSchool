"""
Сайтын хандалт.
  POST /api/analytics/view/            {path, visitor} → 204 (робот, админ хуудас, 10 минутын дотор давтан ачаалалтыг тоолохгүй)
  GET  /api/analytics/admin/summary/?range=week|month|year  (админы аль ч хэсгийн эрхтэй ажилтан)
"""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import current_user
from ..auth.models import User
from ..db import get_db
from .service import check_visitor, clean_path, is_admin_path, is_bot, record_view, summary

router = APIRouter(prefix="/api/analytics", tags=["analytics"])
DB = Annotated[AsyncSession, Depends(get_db)]


class ViewIn(BaseModel):
    path: str = Field(max_length=2000)
    visitor: str = Field(max_length=200)


async def staff(user: Annotated[User, Depends(current_user)]) -> User:
    if not user.is_staff:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Энэ үйлдэлд эрх хүрэхгүй.")
    return user


@router.post("/view/", status_code=204)
async def view(body: ViewIn, request: Request, db: DB):
    path, visitor = clean_path(body.path), check_visitor(body.visitor)
    if not is_bot(request.headers.get("user-agent", "")) and not is_admin_path(path):
        await record_view(db, path, visitor)
    return Response(status_code=204)


@router.get("/admin/summary/")
async def admin_summary(db: DB, _: Annotated[User, Depends(staff)], range: Literal["week", "month", "year"] = "week"):
    return await summary(db, range)
