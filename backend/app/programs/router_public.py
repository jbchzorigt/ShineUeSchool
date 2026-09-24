"""
Хөтөлбөр — нээлттэй API (зөвхөн нийтлэгдсэн).
  GET /api/programs/          → [ProgramCard] (нүүрний картууд)
  GET /api/programs/{slug}/   → ProgramDetail (хэрэгжилт, бүтээл, тэтгэлэг + нийт дүн)
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from .models import Program
from .schemas import ProgramCard, ProgramDetail
from .service import card_out, detail_out, list_programs

router = APIRouter(prefix="/api/programs", tags=["programs"])
DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("/", response_model=list[ProgramCard])
async def programs_list(request: Request, db: DB):
    return [card_out(request, p) for p in await list_programs(db, published_only=True)]


@router.get("/{slug}/", response_model=ProgramDetail)
async def program_get(slug: str, request: Request, db: DB):
    p = (await db.execute(select(Program).where(Program.slug == slug, Program.is_published.is_(True)))).scalar_one_or_none()
    if p is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    return detail_out(request, p)
