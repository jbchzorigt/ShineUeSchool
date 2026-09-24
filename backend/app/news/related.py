"""
Агуулгаар ойр мэдээ (санал болгох): TF-IDF + cosine similarity, гадны сангүй.
  - Текст = гарчиг (TITLE_WEIGHT дахин) + товч + бие (HTML tag-ийг хуулна).
  - Монгол дагаврыг тэгшитгэхийн тулд үгийг STEM_LEN үсгээр тайрна ("олимпиадын" → "олимп").
  - Богино үг, түгээмэл үгсийг (STOP) хасна. Ижил ангилалд CATEGORY_BONUS нэмнэ.
  - Оноо 0 бол (нийтлэг үггүй) ойрд тооцохгүй; router нь хамгийн шинэ мэдээгээр нөхнө.
"""

import math
import re
from collections import Counter
from collections.abc import Iterable

TITLE_WEIGHT = 3
STEM_LEN = 5
MIN_LEN = 3
CATEGORY_BONUS = 0.1

STOP = frozenset("""
ба бол болон буюу гэж гэх гэсэн мөн нь энэ тэр тус бүр юм байна байсан байгаа байх болно болсон бусад
хэд хэдэн зэрэг үед дээр доор хойш өмнө талаар тухай учир тул хүртэл дараа энэ тэдгээр бид та
the and for with this that from
""".split())

_TAG = re.compile(r"<[^>]+>")
_WORD = re.compile(r"[a-zа-яөүё0-9]+")


def strip_html(html: str) -> str:
    return _TAG.sub(" ", html or "")


def tokens(text: str) -> list[str]:
    """Жижиг үсэг, үгийн эхний STEM_LEN үсэг; богино ба түгээмэл үгийг хасна."""
    out = []
    for w in _WORD.findall((text or "").lower()):
        if len(w) < MIN_LEN or w in STOP:
            continue
        out.append(w[:STEM_LEN])
    return out


def doc_tokens(title: str, excerpt: str, body_html: str) -> list[str]:
    return tokens(title) * TITLE_WEIGHT + tokens(excerpt) + tokens(strip_html(body_html))


def rank(target: int, docs: dict[int, list[str]], categories: dict[int, int | None]) -> list[tuple[int, float]]:
    """Бусад мэдээг зорилтот мэдээтэй ойр байдлаар нь буурахаар эрэмбэлнэ (оноо > 0 нь л орно).

    docs: {post_id: tokens}, categories: {post_id: category_id}. target нь docs-д байх ёстой.
    Буцаах: [(post_id, score)] — score = cosine(tf-idf) (+ CATEGORY_BONUS ижил ангилалд).
    """
    n = len(docs)
    if n < 2 or target not in docs:
        return []
    df: Counter[str] = Counter()
    for toks in docs.values():
        df.update(set(toks))
    idf = {t: math.log((1 + n) / (1 + d)) + 1 for t, d in df.items()}

    def vec(toks: Iterable[str]) -> dict[str, float]:
        tf = Counter(toks)
        return {t: c * idf[t] for t, c in tf.items()}

    def cos(a: dict[str, float], b: dict[str, float]) -> float:
        if not a or not b:
            return 0.0
        dot = sum(w * b[t] for t, w in a.items() if t in b)
        na, nb = math.sqrt(sum(w * w for w in a.values())), math.sqrt(sum(w * w for w in b.values()))
        return dot / (na * nb) if na and nb else 0.0

    tv, tcat = vec(docs[target]), categories.get(target)
    scored = []
    for pid, toks in docs.items():
        if pid == target:
            continue
        s = cos(tv, vec(toks))
        if s <= 0:
            continue
        if tcat is not None and categories.get(pid) == tcat:
            s += CATEGORY_BONUS
        scored.append((pid, s))
    scored.sort(key=lambda x: -x[1])
    return scored
