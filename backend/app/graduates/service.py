from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..common.errors import FieldError
from .countries import CATALOGUE
from .models import STATS_DEFAULTS, GraduateCountry, GraduateStats
from .schemas import DestinationOut, StatsOut, StatsPatch

MAX_UNIVERSITIES = 100
MAX_NAME = 200


def out(c: GraduateCountry) -> DestinationOut:
    info = CATALOGUE[c.code]
    return DestinationOut(id=c.id, universities=list(c.universities or []), order=c.order, **info)


async def list_countries(db: AsyncSession) -> list[GraduateCountry]:
    return list((await db.execute(select(GraduateCountry).order_by(GraduateCountry.order, GraduateCountry.id))).scalars())


def clean_universities(items: list[str]) -> list[str]:
    """Хоосон мөрийг хаяж, давхардлыг (том/жижиг үсэг үл харгалзан) нэг удаа үлдээнэ; дор хаяж 1 сургууль заавал."""
    seen: set[str] = set()
    result: list[str] = []
    for raw in items:
        name = " ".join((raw or "").split())
        if not name:
            continue
        if len(name) > MAX_NAME:
            raise FieldError("universities", f"Сургуулийн нэр {MAX_NAME} тэмдэгтээс урт байж болохгүй.")
        key = name.casefold()
        if key in seen:
            continue
        seen.add(key)
        result.append(name)
    if not result:
        raise FieldError("universities", "Дор хаяж нэг сургууль бичнэ үү.")
    if len(result) > MAX_UNIVERSITIES:
        raise FieldError("universities", f"Хамгийн ихдээ {MAX_UNIVERSITIES} сургууль.")
    return result


# ---- Тоонууд (нэг мөр) ----
STATS_MAX = 1_000_000


async def get_stats(db: AsyncSession) -> GraduateStats:
    """Нэг мөрт тохиргоо; байхгүй бол 0-үүдээр үүсгэнэ (зэрэг үүсгэх оролдлогод хоёр дахь нь дахин уншина — about.get_page загвар)."""
    st = await db.get(GraduateStats, 1)
    if st is not None:
        return st
    db.add(GraduateStats(id=1, **STATS_DEFAULTS))
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
    return await db.get(GraduateStats, 1)  # type: ignore[return-value]


def stats_out(st: GraduateStats) -> StatsOut:
    return StatsOut(total_graduates=st.total_graduates, university_percent=st.university_percent,
                    university_count=st.university_count, abroad_count=st.abroad_count)


def apply_stats(st: GraduateStats, data: StatsPatch) -> None:
    for field in ("total_graduates", "university_percent", "university_count", "abroad_count"):
        v = getattr(data, field)
        if v is None:
            continue
        if v < 0:
            raise FieldError(field, "Сөрөг тоо байж болохгүй.")
        if field == "university_percent" and v > 100:
            raise FieldError(field, "Хувь 0–100 байна.")
        if v > STATS_MAX:
            raise FieldError(field, f"Хамгийн ихдээ {STATS_MAX:,}.")
        setattr(st, field, v)
