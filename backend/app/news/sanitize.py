"""Rich text HTML-ийг nh3-ээр цэвэрлэнэ (XSS хамгаалалт)."""

import nh3

TAGS = {"p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "ul", "ol", "li", "a", "img", "blockquote"}
ATTRS = {"a": {"href", "title"}, "img": {"src", "alt"}}


def clean_html(html: str) -> str:
    return nh3.clean(
        html or "", tags=TAGS, attributes=ATTRS, url_schemes={"http", "https", "mailto"},
        link_rel="noopener noreferrer", strip_comments=True,
    )
