"""
Бидний тухай — нээлттэй API.
  GET /api/about/ → {page:{intro_title,intro_html,stats}, leaders:[...], departments:[{id,name,teachers:[...]}]}
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from .schemas import AboutOut
from .service import department_out, get_page, leader_out, list_departments, list_leaders, page_out

router = APIRouter(prefix="/api/about", tags=["about"])
DB = Annotated[AsyncSession, Depends(get_db)]


@router.get("/", response_model=AboutOut)
async def about_get(request: Request, db: DB):
    return AboutOut(
        page=page_out(await get_page(db)),
        leaders=[leader_out(request, l) for l in await list_leaders(db)],
        departments=[department_out(d) for d in await list_departments(db)],
    )
