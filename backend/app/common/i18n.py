"""Хэлний туслах: нийтийн API `?lang=mn|en`. Англи утга хоосон бол монголоор (fallback)."""

from typing import Literal

Lang = Literal["mn", "en"]


def localized(mn: str, en: str, lang: Lang) -> str:
    """lang == "en" ба англи утга бөглөгдсөн бол англи, үгүй бол монгол утга."""
    return en if lang == "en" and (en or "").strip() else mn
