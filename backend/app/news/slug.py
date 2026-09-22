"""Slug: кирилл → латин галиг, зөвхөн [a-z0-9-]. Давхардвал -2, -3."""

import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

_MAP = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo", "ж": "zh", "з": "z", "и": "i",
    "й": "i", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "ө": "o", "п": "p", "р": "r", "с": "s",
    "т": "t", "у": "u", "ү": "u", "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "shch",
    "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
}


def slugify(text: str) -> str:
    s = "".join(_MAP.get(ch, ch) for ch in text.lower())
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:200] or "post"


async def unique_slug(db: AsyncSession, base: str, exclude_id: int | None = None) -> str:
    """base, base-2, base-3 ... эхний чөлөөтэйг буцаана (exclude_id-тэй мөрийг тооцохгүй)."""
    from .models import Post  # тойрог импорт

    candidate, n = base, 1
    while True:
        q = select(Post.id).where(Post.slug == candidate)
        if exclude_id is not None:
            q = q.where(Post.id != exclude_id)
        if (await db.execute(q)).first() is None:
            return candidate
        n += 1
        candidate = f"{base}-{n}"
