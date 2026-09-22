"""
Зочны нэвтрэлт (Facebook Login).
  GET  /api/social/facebook/status/  → {enabled, app_id, page_url}
  POST /api/social/facebook/login/   {access_token} → {token, visitor}
  GET  /api/social/me/               Bearer visitor → VisitorOut
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..db import get_db
from ..news.schemas import VisitorOut
from .deps import create_visitor_token, current_visitor
from .facebook import FacebookClient, FacebookError, get_facebook
from .models import Visitor
from .schemas import FbLoginIn, FbLoginOut, FbStatus

router = APIRouter(prefix="/api/social", tags=["social"])


@router.get("/facebook/status/", response_model=FbStatus)
async def fb_status():
    return FbStatus(enabled=settings.fb_enabled, app_id=settings.fb_app_id if settings.fb_enabled else "",
                    page_url=f"https://www.facebook.com/{settings.fb_page_id}" if settings.fb_enabled else "")


@router.post("/facebook/login/", response_model=FbLoginOut)
async def fb_login(body: FbLoginIn, db: Annotated[AsyncSession, Depends(get_db)],
                   fb: Annotated[FacebookClient, Depends(get_facebook)]):
    try:
        await fb.debug_token(body.access_token)
        info = await fb.me(body.access_token)
    except FacebookError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Facebook токен хүчингүй.")
    v = (await db.execute(select(Visitor).where(Visitor.fb_id == str(info["id"])))).scalar_one_or_none()
    if v is None:
        v = Visitor(fb_id=str(info["id"]), name=info["name"] or "Зочин", avatar_url=info.get("picture_url", ""))
        db.add(v)
    else:
        v.name = info["name"] or v.name
        v.avatar_url = info.get("picture_url", "") or v.avatar_url
    await db.flush()
    if v.is_blocked:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Таны хандалт хаагдсан байна.")
    await db.commit()
    return FbLoginOut(token=create_visitor_token(v.id), visitor=VisitorOut(id=v.id, name=v.name, avatar_url=v.avatar_url))


@router.get("/me/", response_model=VisitorOut)
async def social_me(v: Annotated[Visitor, Depends(current_visitor)]):
    return VisitorOut(id=v.id, name=v.name, avatar_url=v.avatar_url)
