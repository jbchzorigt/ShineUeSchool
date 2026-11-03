"""
Хуучин сайтын (Greensoft COS) 475 мэдээг legacy/greensoft-archive-аас мэдээний булан руу (news_posts) оруулна.
Facebook руу юу ч нийтлэхгүй: зөвхөн баазад шууд бичнэ (FB-д нийтлэх нь зөвхөн админы publish + post_to_facebook).

    uv run python scripts/import_greensoft.py --media-base-url http://localhost:8000            # оруулна
    uv run python scripts/import_greensoft.py --media-base-url http://localhost:8000 --dry-run  # юу орохыг л харуулна
    uv run python scripts/import_greensoft.py --media-base-url https://<backend> --reset        # хуучин импортыг устгаад дахин

--media-base-url: бие доторх зургийн бүтэн хаяг (админы upload-image-тэй ижил хэлбэр: <base>/media/news/...).
Production-д backend-ийн нийтийн хаягийг өгнө (MEDIA_BASE_URL).

- Slug: <гарчгийн галиг>-<greensoft id> → дахин ажиллуулахад байгаа мэдээг алгасна (idempotent).
- Зураг: media-manifest.json-оор локал файлыг олж MEDIA_DIR/news/legacy/<sha256[:16]>.<ext> руу хуулна (давхардалгүй).
- iframe (Facebook пост/видео, YouTube, PDF) → холбоос болгоно (clean_html iframe-ийг хасдаг).
- Ангилал: мэдээний эхний ангилал (backend нэг л ангилал дэмждэг); байхгүй бол ангилалгүй.
- Огноо: Greensoft-ийн цаг Улаанбаатарынх (UTC+8, 2017 оноос хойш DST байхгүй; бүх мэдээ 2020+).
"""

import argparse
import asyncio
import html
import json
import re
import shutil
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PIL import Image  # noqa: E402
from sqlalchemy import delete, select  # noqa: E402

import app.models_all  # noqa: E402, F401  — news_posts.author_id → users гэх мэт FK-ууд metadata-д бүртгэгдэнэ
from app.config import settings  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.news.models import Category, Post  # noqa: E402
from app.news.sanitize import clean_html  # noqa: E402
from app.news.slug import slugify  # noqa: E402

ARCHIVE = Path(__file__).resolve().parents[2] / "legacy" / "greensoft-archive"
UB = timezone(timedelta(hours=8))
IMAGE_FORMATS = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp", "GIF": ".gif"}

CATEGORY_SLUGS = {
    "Цаг үеийн мэдээ": "tsag-uyeiin-medee",
    "Зарлал": "zarlal",
    "Хөгжүүлэх сургалтууд": "khogjuulekh-surgaltuud",
    "КАС": "kas",
    "Зөвөлгөө": "zovolgoo",
    "Багшийн хөгжил": "bagshiin-khogjil",
    "SHINE UE NEWSPAPER": "shine-ue-newspaper",
}


class Media:
    """Greensoft URL → MEDIA_DIR дахь хуулбарын зам. sha256-аар давхардлыг арилгана."""

    def __init__(self, dry_run: bool):
        manifest = json.loads((ARCHIVE / "media-manifest.json").read_text(encoding="utf-8"))
        self.by_url = {m["url"]: m for m in manifest if m.get("file") and m.get("status") == 200}
        self.dry_run = dry_run
        self.copied: dict[str, str] = {}
        self.missing: set[str] = set()

    def _entry(self, url: str) -> dict | None:
        url = html.unescape(url)
        if url.startswith("//"):
            url = "https:" + url
        return self.by_url.get(url) or self.by_url.get(unquote(url))

    def image(self, url: str) -> str | None:
        """Зургийг хуулаад MEDIA_DIR-ээс хамаарах замыг ("news/legacy/ab12.jpg") буцаана; олдохгүй/эвдэрсэн бол None."""
        m = self._entry(url)
        if not m:
            self.missing.add(url)
            return None
        if m["sha256"] in self.copied:
            return self.copied[m["sha256"]]
        src = ARCHIVE / m["file"]
        try:
            with Image.open(src) as im:
                ext = IMAGE_FORMATS.get(im.format or "")
        except Exception:
            ext = None
        if not ext:
            self.missing.add(url)
            return None
        rel = f"news/legacy/{m['sha256'][:16]}{ext}"
        self._copy(src, rel)
        self.copied[m["sha256"]] = rel
        return rel

    def file(self, url: str) -> tuple[str, str] | None:
        """Хавсралт (PDF, PPTX): (rel зам, анхны нэр)."""
        m = self._entry(url)
        if not m:
            self.missing.add(url)
            return None
        src = ARCHIVE / m["file"]
        rel = f"news/legacy/files/{m['sha256'][:16]}{src.suffix.lower()}"
        self._copy(src, rel)
        return rel, src.name

    def _copy(self, src: Path, rel: str) -> None:
        dst = settings.media_dir / rel
        if self.dry_run or dst.exists():
            return
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dst)


def link(href: str, text: str) -> str:
    return f'<p><a href="{html.escape(href, quote=True)}">{html.escape(text)}</a></p>'


def convert_iframe(src: str, media: Media, media_base: str) -> str:
    """iframe-ийг холбоос болгоно (Facebook/YouTube/PDF); танихгүй бол хасна."""
    src = html.unescape(src)
    if src.startswith("//"):
        src = "https:" + src
    u = urlparse(src)
    if "facebook.com" in u.netloc:
        target = parse_qs(u.query).get("href", [""])[0]
        return link(target, "Facebook дээр үзэх") if target.startswith("http") else ""
    if "youtube.com" in u.netloc and "/embed/" in u.path:
        return link(f"https://www.youtube.com/watch?v={u.path.rsplit('/', 1)[-1]}", "YouTube дээр үзэх")
    if u.netloc.endswith("greensoft.mn"):
        f = media.file(src)
        return link(f"{media_base}/media/{f[0]}", f"Татах: {f[1]}") if f else ""
    return ""


IFRAME_RE = re.compile(r"<iframe\b[^>]*\bsrc\s*=\s*\"([^\"]+)\"[^>]*>(?:\s*</iframe>)?", re.I)
IMG_RE = re.compile(r"<img\b[^>]*>", re.I)
IMG_SRC_RE = re.compile(r"\bsrc\s*=\s*\"([^\"]+)\"", re.I)


def convert_body(body: str, media: Media, media_base: str) -> str:
    body = IFRAME_RE.sub(lambda m: convert_iframe(m.group(1), media, media_base), body)

    def img(m: re.Match) -> str:
        s = IMG_SRC_RE.search(m.group(0))
        rel = media.image(s.group(1)) if s else None
        return f'<img src="{media_base}/media/{rel}" alt="">' if rel else ""

    body = IMG_RE.sub(img, body)
    return clean_html(body)


def plain_text(body_html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", body_html)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def excerpt_for(a: dict, body_html: str) -> str:
    text = re.sub(r"\s+", " ", (a.get("summary") or "").strip()) or plain_text(body_html)
    return text if len(text) <= 280 else text[:279].rsplit(" ", 1)[0] + "…"


async def main(media_base: str, dry_run: bool, reset: bool) -> None:
    media_base = media_base.rstrip("/")
    articles = json.loads((ARCHIVE / "articles" / "articles.json").read_text(encoding="utf-8"))
    media = Media(dry_run)
    slugs = {a["id"]: f"{slugify(a['title'])[:180]}-{a['id']}" for a in articles}

    async with SessionLocal() as db:
        if reset and not dry_run:
            n = (await db.execute(delete(Post).where(Post.slug.in_(slugs.values())))).rowcount
            print(f"Өмнөх импорт устгагдлаа: {n}")

        cats = {c.slug: c for c in (await db.execute(select(Category))).scalars()}
        for order, (name, slug) in enumerate(CATEGORY_SLUGS.items(), start=1):
            if slug not in cats:
                cats[slug] = Category(name=name, slug=slug, order=order)
                db.add(cats[slug])
        await db.flush()

        existing = set((await db.execute(select(Post.slug).where(Post.slug.in_(slugs.values())))).scalars())
        added = skipped = 0
        for a in sorted(articles, key=lambda x: x["published_at"]):
            slug = slugs[a["id"]]
            if slug in existing:
                skipped += 1
                continue
            body = convert_body(a.get("body_html") or "", media, media_base)
            for url in a.get("attachments") or []:
                if url not in (a.get("body_html") or ""):
                    f = media.file(url)
                    if f:
                        body += link(f"{media_base}/media/{f[0]}", f"Татах: {f[1]}")
            cat_name = next((c for c in a.get("categories") or [] if c in CATEGORY_SLUGS), None)
            db.add(Post(
                title=a["title"].strip()[:200],
                slug=slug,
                excerpt=excerpt_for(a, a.get("body_html") or ""),  # анхны текстээс (iframe→холбоосын бичвэр орохгүй)
                body_html=body,
                cover_image=media.image(a["cover_image"]) if a.get("cover_image") else None,
                category=cats[CATEGORY_SLUGS[cat_name]] if cat_name else None,
                published_at=datetime.fromisoformat(a["published_at"]).replace(tzinfo=UB),
                is_published=True,
            ))
            added += 1

        if dry_run:
            await db.rollback()
        else:
            await db.commit()

    print(f"{'[dry-run] ' if dry_run else ''}Нэмэгдсэн: {added}, алгассан (аль хэдийн байгаа): {skipped}, "
          f"хуулсан зураг: {len(media.copied)}, олдоогүй медиа: {len(media.missing)}")
    for url in sorted(media.missing):
        print("  олдоогүй:", url)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--media-base-url", default=settings.media_base_url or "http://localhost:8000")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--reset", action="store_true")
    args = ap.parse_args()
    asyncio.run(main(args.media_base_url, args.dry_run, args.reset))
