"""
Төгсөгчдийн жишээ өгөгдөл (нүүрний «Төгсөлт»): тоонууд + 8 улс, сургуулиуд. Дахин ажиллуулахад аль хэдийн байгаа улсыг
алгасна; тоонууд зөвхөн бүгд 0 (анхдагч) үед л бичигдэнэ. ⚠ Жишээ — админаас (/admin/graduates) бодит утгаар солино.

    uv run python scripts/seed_graduates.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import func, select  # noqa: E402

from app.db import SessionLocal  # noqa: E402
from app.graduates.models import GraduateCountry  # noqa: E402
from app.graduates.service import get_stats  # noqa: E402

STATS = {"total_graduates": 777, "university_percent": 85, "university_count": 95, "abroad_count": 120}
COUNTRIES: list[tuple[str, list[str]]] = [
    ("US", ["Massachusetts Institute of Technology", "University of California, Berkeley", "Stanford University"]),
    ("CA", ["University of British Columbia", "University of Toronto"]),
    ("GB", ["University College London"]),
    ("DE", ["Technische Universität München"]),
    ("JP", ["University of Tokyo", "Kyoto University"]),
    ("KR", ["KAIST"]),
    ("AU", ["University of Melbourne"]),
    ("BR", ["Universidade de São Paulo"]),
]


async def main() -> None:
    async with SessionLocal() as db:
        st = await get_stats(db)
        if not any(getattr(st, k) for k in STATS):
            for k, v in STATS.items():
                setattr(st, k, v)
            print("Тоонууд бичигдлээ.")
        else:
            print("Тоонууд аль хэдийн байна — алгаслаа.")
        existing = set((await db.execute(select(GraduateCountry.code))).scalars())
        order = (await db.execute(select(func.max(GraduateCountry.order)))).scalar() or 0
        added = 0
        for code, unis in COUNTRIES:
            if code in existing:
                continue
            order += 1
            db.add(GraduateCountry(code=code, universities=unis, order=order))
            added += 1
        await db.commit()
        print(f"Улс нэмэгдсэн: {added} (байсан: {len(existing)}).")


if __name__ == "__main__":
    asyncio.run(main())
