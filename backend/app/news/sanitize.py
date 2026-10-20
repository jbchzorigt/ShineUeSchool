"""Rich text HTML-ийг nh3-ээр цэвэрлэнэ (XSS хамгаалалт)."""

import re

import nh3

TAGS = {"p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "ul", "ol", "li", "a", "img", "blockquote"}
ATTRS = {"a": {"href", "title"}, "img": {"src", "alt"}}


def clean_html(html: str) -> str:
    return nh3.clean(
        html or "", tags=TAGS, attributes=ATTRS, url_schemes={"http", "https", "mailto"},
        link_rel="noopener noreferrer", strip_comments=True,
    )


_EMPTY_RE = re.compile(r"(\s*<p>\s*</p>\s*)*")


def clean_rich(html: str) -> str:
    """clean_html + Tiptap-ийн хоосон үеийн "<p></p>"-г "" болгоно (англи хоосон бол монгол fallback ажиллах, нийтэд хоосон хэсэг нуух)."""
    html = clean_html(html)
    return "" if _EMPTY_RE.fullmatch(html) else html
