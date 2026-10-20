"""Хэлний туслах (app/common/i18n.py) ба шинэ `_en` баганын анхдагч утга."""

from app.common.i18n import localized


def test_localized_fallback():
    assert localized("Мэдээ", "News", "en") == "News"
    assert localized("Мэдээ", "   ", "en") == "Мэдээ"
    assert localized("Мэдээ", "News", "mn") == "Мэдээ"
    assert localized("", "News", "mn") == ""


async def test_en_columns_default_empty(db):
    from app.news.models import Post
    p = Post(title="Т", slug="t")
    db.add(p)
    await db.flush()
    await db.refresh(p)
    assert (p.title_en, p.excerpt_en, p.body_html_en) == ("", "", "")
