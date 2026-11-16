"""Сайтын хандалтын туслахууд: Улаанбаатарын өдөр, робот таних, замыг цэвэрлэх, тойм (7 хоног / сар / жил)."""

import re
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..common.errors import FieldError
from .models import PageView

UB = timezone(timedelta(hours=8))   # Монгол — зуны цаг 2017 оноос хэрэглэдэггүй
DEDUP_MINUTES = 10                  # ижил зочин ижил хуудсыг энэ хугацаанд дахин ачаалбал тоолохгүй
BOT_RE = re.compile(r"bot|crawl|spider|slurp|headless|preview|facebookexternalhit|curl|wget|python-|httpx|axios|monitor", re.I)
VISITOR_RE = re.compile(r"^[A-Za-z0-9-]{8,64}$")


def ub_today() -> date:
    return datetime.now(UB).date()


def is_bot(user_agent: str) -> bool:
    return not user_agent or bool(BOT_RE.search(user_agent))


def clean_path(path: str) -> str:
    """Query string, hash хасна; "/"-ээр эхэлсэн, ≤200 тэмдэгт байх ёстой."""
    p = path.split("?", 1)[0].split("#", 1)[0].strip()
    if not p.startswith("/") or len(p) > 200:
        raise FieldError("path", "Буруу хуудасны зам.")
    return p


def check_visitor(visitor: str) -> str:
    if not VISITOR_RE.match(visitor):
        raise FieldError("visitor", "Буруу зочны ID.")
    return visitor


def is_admin_path(path: str) -> bool:
    return path == "/admin" or path.startswith("/admin/")


async def record_view(db: AsyncSession, path: str, visitor: str) -> bool:
    """Давтан ачаалалтаас бусдыг бүртгэнэ. Бүртгэсэн эсэхийг буцаана.
    Зэрэг ирсэн ижил (зочин, зам) хүсэлтүүд шалгалт→бичилтийн хооронд уралдахгүйн тулд transaction-ий advisory lock
    (commit/rollback-д чөлөөлөгдөнө); өөр зочин, өөр хуудас бие биеэ хүлээхгүй."""
    await db.execute(select(func.pg_advisory_xact_lock(func.hashtext(f"pv|{visitor}|{path}"))))
    since = datetime.now(timezone.utc) - timedelta(minutes=DEDUP_MINUTES)
    dup = (await db.execute(select(PageView.id).where(PageView.visitor == visitor, PageView.path == path, PageView.created_at >= since).limit(1))).first()
    if dup:
        await db.commit()   # lock-ийг шууд чөлөөлнө
        return False
    db.add(PageView(day=ub_today(), path=path, visitor=visitor))
    await db.commit()
    return True


async def summary(db: AsyncSession, span: str) -> dict:
    """span: week (7 өдөр), month (30 өдөр) — өдрөөр; year — сүүлийн 12 сар, сараар. Зочин = давтагдашгүй visitor."""
    today = ub_today()
    if span == "year":
        first = date(today.year, today.month, 1)
        months = []
        y, m = first.year, first.month
        for _ in range(12):
            months.append(date(y, m, 1))
            y, m = (y, m - 1) if m > 1 else (y - 1, 12)
        months.reverse()
        start = months[0]
        bucket = func.date_trunc("month", PageView.day).label("b")
        rows = (await db.execute(select(bucket, func.count(PageView.id), func.count(func.distinct(PageView.visitor)))
                                 .where(PageView.day >= start).group_by(bucket))).all()
        got = {r[0].date() if isinstance(r[0], datetime) else r[0]: (r[2], r[1]) for r in rows}
        points = [{"date": d.isoformat(), "label": f"{d.year}.{d.month:02d}", "visitors": got.get(d, (0, 0))[0], "views": got.get(d, (0, 0))[1]} for d in months]
    else:
        days = 7 if span == "week" else 30
        start = today - timedelta(days=days - 1)
        rows = (await db.execute(select(PageView.day, func.count(PageView.id), func.count(func.distinct(PageView.visitor)))
                                 .where(PageView.day >= start).group_by(PageView.day))).all()
        got = {r[0]: (r[2], r[1]) for r in rows}
        points = []
        for i in range(days):
            d = start + timedelta(days=i)
            v, n = got.get(d, (0, 0))
            points.append({"date": d.isoformat(), "label": f"{d.month:02d}.{d.day:02d}", "visitors": v, "views": n})
    total_views, total_visitors = (await db.execute(
        select(func.count(PageView.id), func.count(func.distinct(PageView.visitor))).where(PageView.day >= start))).one()
    tv, tn = (await db.execute(select(func.count(func.distinct(PageView.visitor)), func.count(PageView.id)).where(PageView.day == today))).one()
    top = (await db.execute(select(PageView.path, func.count(PageView.id).label("n")).where(PageView.day >= start)
                            .group_by(PageView.path).order_by(func.count(PageView.id).desc(), PageView.path).limit(5))).all()
    return {"range": span, "points": points, "total_visitors": total_visitors, "total_views": total_views,
            "today": {"visitors": tv, "views": tn}, "top_pages": [{"path": p, "views": n} for p, n in top]}
