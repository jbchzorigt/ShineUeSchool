"""Timetable router-уудын нийтлэг dependency, туслахууд."""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.deps import require_role
from ..auth.models import User
from ..common.errors import FieldError
from ..db import get_db
from .models import AcademicYear

DB = Annotated[AsyncSession, Depends(get_db)]
Manager = Annotated[User, Depends(require_role("manager"))]


async def get_or_404(db: AsyncSession, model, id: int):
    obj = await db.get(model, id)
    if obj is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Олдсонгүй.")
    return obj


async def commit_or_400(db: AsyncSession, field: str, message: str) -> None:
    """flush + commit; unique/FK зөрчил гарвал 400 {field: [message]}."""
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise FieldError(field, message) from None
    await db.commit()


async def delete_or_400(db: AsyncSession, obj, message: str) -> None:
    """Устгана; өөр мөр (хуваарь, анги) ашиглаж байвал 400 {non_field_errors: [message]}."""
    await db.delete(obj)
    await commit_or_400(db, "non_field_errors", message)


async def resolve_year(db: AsyncSession, year: int | None) -> AcademicYear | None:
    """?year= өгсөн бол тэр жил (байхгүй бол 404); үгүй бол одоогийн жил (байхгүй бол None)."""
    if year is not None:
        return await get_or_404(db, AcademicYear, year)
    return (await db.execute(select(AcademicYear).where(AcademicYear.is_current.is_(True)))).scalar_one_or_none()
