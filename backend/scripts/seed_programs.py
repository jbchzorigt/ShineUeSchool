"""
Хөтөлбөрийн 3 төрөл (нүүрний картууд, /programs/[slug]): IBDP хөтөлбөр, Cambridge хөтөлбөр, Үндэсний цөм хөтөлбөр.
Slug-аар нь шалгаж байхгүйг үүсгэнэ; байгаа бол нэр/badge/summary/анги нь анхны тестийн утга байвал шинэчилнэ, админаас
засварласан утгад хүрэхгүй. ⚠ Тайлбар текст жишээ — админаас (/admin/programs) бодит агуулгаар солино.

    uv run python scripts/seed_programs.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import func, select  # noqa: E402

from app.db import SessionLocal  # noqa: E402
from app.programs.models import Program  # noqa: E402

# slug → талбарууд. old_names: өмнөх тестийн нэрс — эдгээртэй таарвал шинэчилнэ.
PROGRAMS = [
    {
        "slug": "ib-diploma-programme", "name": "IBDP хөтөлбөр", "badge": "IBDP",
        "summary": "Олон улсын бакалаврын (IB Diploma Programme) хөтөлбөр — 11–12-р анги.",
        "grade_from": 11, "grade_to": 12,
        "body_html": "<p>IB Diploma Programme нь дэлхийн шилдэг их сургуулиудад хүлээн зөвшөөрөгдсөн 2 жилийн хөтөлбөр. [Хэрэгжилтийн талаар админаас бичнэ.]</p>",
        "old_names": {"IB Diploma Programme"},
    },
    {
        "slug": "cambridge-international", "name": "Cambridge хөтөлбөр", "badge": "Cambridge",
        "summary": "Кембрижийн олон улсын (Cambridge International) хөтөлбөр — 7–10-р анги.",
        "grade_from": 7, "grade_to": 10,
        "body_html": "<p>Cambridge International хөтөлбөрөөр IGCSE түвшний сургалт явуулна. [Хэрэгжилтийн талаар админаас бичнэ.]</p>",
        "old_names": {"Cambridge International"},
    },
    {
        "slug": "national-core-curriculum", "name": "Үндэсний цөм хөтөлбөр", "badge": "Үндэсний",
        "summary": "Монгол Улсын ерөнхий боловсролын цөм хөтөлбөр — 1–12-р анги.",
        "grade_from": 1, "grade_to": 12,
        "body_html": "<p>Бага, суурь, бүрэн дунд боловсролын үндэсний цөм хөтөлбөрийн дагуу сургалт явуулна. [Хэрэгжилтийн талаар админаас бичнэ.]</p>",
        "old_names": set(),
    },
]
FIELDS = ("name", "badge", "summary", "grade_from", "grade_to")


async def main() -> None:
    async with SessionLocal() as db:
        order = (await db.execute(select(func.max(Program.order)))).scalar() or 0
        for spec in PROGRAMS:
            p = (await db.execute(select(Program).where(Program.slug == spec["slug"]))).scalar_one_or_none()
            if p is None:
                order += 1
                db.add(Program(slug=spec["slug"], order=order, is_published=True, body_html=spec["body_html"],
                               **{k: spec[k] for k in FIELDS}))
                print(f"Үүсгэв: {spec['name']}")
            elif p.name in spec["old_names"]:
                for k in FIELDS:
                    setattr(p, k, spec[k])
                print(f"Шинэчлэв: {p.slug} → {spec['name']}")
            else:
                print(f"Байна (хүрээгүй): {p.slug}")
        await db.commit()


if __name__ == "__main__":
    asyncio.run(main())
