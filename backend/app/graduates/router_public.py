"""
Төгсөгчдийн газрын зураг — нээлттэй API.
  GET /api/graduates/        → [DestinationOut] (улс + тив + координат + сургуулиуд), дарааллаар
  GET /api/graduates/stats/  → StatsOut (нийт төгсөгч, их дээд сургуульд элссэн хувь/тоо, гадаад)
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from .schemas import DestinationOut, StatsOut
from .service import get_stats, list_countries, out, stats_out

router = APIRouter(prefix="/api/graduates", tags=["graduates"])
DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("/", response_model=list[DestinationOut])
async def graduates_list(db: DB):
    return [out(c) for c in await list_countries(db)]


@router.get("/stats/", response_model=StatsOut)
async def graduates_stats(db: DB):
    return stats_out(await get_stats(db))
