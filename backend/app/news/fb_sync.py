"""
Facebook Page-ийн нийтлэлүүдийг мэдээний булан (news_posts) руу автоматаар татна — /news нэг л мэдээний хэсэг.
Чиглэл нэг талын: Facebook → сайт. Сайтын мэдээ Facebook руу зөвхөн админы publish + post_to_facebook-оор очно.

- main.py-ийн lifespan FB_SYNC_INTERVAL_MINUTES тутам sync_once()-ийг ажиллуулна (0 = унтраах).
  Олон worker/instance зэрэг ажиллахаас Postgres advisory lock хамгаална.
- Гараар: `uv run python -m app.news.fb_sync` (эхний удаа --backfill-аар бүх түүхийг татна).
- Таних: fb_post_id. Сайтаас Facebook руу нийтэлсэн мэдээ (fb_post_id-тэй) аль хэдийн байгаа тул давхардахгүй,
  түүнд гар хүрэхгүй. Энэ модулийн үүсгэсэн мэдээний slug "-fb<id>"-ээр төгсөнө — зөвхөн тэдгээрийг засна/нууна.
- Facebook дээр засвал (текст, зураг) дараагийн sync-д шинэчлэгдэнэ; устгавал (сүүлийн татсан хүрээнд) нийтлэгдээгүй болно.
- Админы шийдвэр давуу: админ гараар өөрчилсөн мэдээнд (Post.fb_sync_detached) sync дахин хүрэхгүй, админы устгасан
  постыг (FbIgnoredPost) дахин үүсгэхгүй.
- Зураг: Facebook CDN-ээс MEDIA_DIR/news/fb/ руу татна (CDN-ийн гарын үсэгтэй URL хугацаа дуусдаг тул).
- Page токен: FB_PAGE_ID, FB_PAGE_ACCESS_TOKEN (pages_read_engagement). App ID/secret шаардлагагүй.
"""

import argparse
import asyncio
import html
import io
import logging
import re
from datetime import datetime
from pathlib import PurePosixPath
from urllib.parse import urlparse

import httpx
from PIL import Image
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..db import SessionLocal
from .models import FbIgnoredPost, Post, PostImage
from .slug import slugify

log = logging.getLogger(__name__)

GRAPH = "https://graph.facebook.com/v26.0"
FIELDS = (
    "id,message,story,created_time,permalink_url,full_picture,"
    "attachments{media_type,media{image{src}},subattachments{media{image{src}}}}"
)
PAGE_SIZE = 25
MAX_IMAGES = 10
LOCK_KEY = 4_217_001  # pg advisory lock: зөвхөн нэг sync зэрэг ажиллана
IMAGE_FORMATS = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp", "GIF": ".gif"}
DEFAULT_TITLE = "Шинэ Үе сургуулийн Facebook нийтлэл"


def sync_enabled() -> bool:
    return bool(settings.fb_page_id and settings.fb_page_access_token and settings.fb_sync_interval_minutes > 0)


def fb_slug_suffix(fb_id: str) -> str:
    return f"-fb{fb_id.rsplit('_', 1)[-1]}"


# ---------- Graph ----------

async def fetch_posts(client: httpx.AsyncClient, max_pages: int) -> list[dict]:
    """Page-ийн нийтлэлүүд (шинэ нь эхэндээ). max_pages × PAGE_SIZE хүртэл."""
    out: list[dict] = []
    params = {"fields": FIELDS, "limit": str(PAGE_SIZE)}
    url = f"{GRAPH}/{settings.fb_page_id}/posts"
    for _ in range(max_pages):
        r = await client.get(url, params=params, headers={"Authorization": f"Bearer {settings.fb_page_access_token}"})
        data = r.json()
        if r.status_code >= 400 or "error" in data:
            raise RuntimeError(data.get("error", {}).get("message", f"Graph API алдаа ({r.status_code})"))
        out.extend(data.get("data", []))
        after = data.get("paging", {}).get("cursors", {}).get("after")
        if not data.get("paging", {}).get("next") or not after:
            break
        params = {**params, "after": after}
    return out


def image_urls(p: dict) -> list[str]:
    """full_picture + attachment-ууд; нэг зураг өөр гарын үсэгтэй URL-аар давтагддаг тул файлын замаар давхардлыг арилгана."""
    urls: list[str] = []
    seen: set[str] = set()

    def push(src: str | None) -> None:
        if not src or len(urls) >= MAX_IMAGES:
            return
        key = urlparse(src).path
        if key not in seen:
            seen.add(key)
            urls.append(src)

    push(p.get("full_picture"))
    for a in p.get("attachments", {}).get("data", []):
        push(a.get("media", {}).get("image", {}).get("src"))
        for s in a.get("subattachments", {}).get("data", []):
            push(s.get("media", {}).get("image", {}).get("src"))
    return urls


async def download_image(client: httpx.AsyncClient, url: str) -> str | None:
    """MEDIA_DIR/news/fb/<CDN файлын нэр>.<ext>. Аль хэдийн байвал дахин татахгүй. Алдаатай бол None."""
    stem = re.sub(r"[^A-Za-z0-9_-]", "", PurePosixPath(urlparse(url).path).stem)[:120] or "image"
    existing = next((settings.media_dir / "news" / "fb").glob(f"{stem}.*"), None) if (settings.media_dir / "news" / "fb").exists() else None
    if existing:
        return f"news/fb/{existing.name}"
    try:
        r = await client.get(url)
        r.raise_for_status()
        with Image.open(io.BytesIO(r.content)) as im:
            ext = IMAGE_FORMATS.get(im.format or "")
    except Exception as e:  # сүлжээ, эвдэрсэн зураг
        log.warning("Facebook зураг татаж чадсангүй: %s", e)
        return None
    if not ext:
        return None
    rel = f"news/fb/{stem}{ext}"
    path = settings.media_dir / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(r.content)
    return rel


# ---------- Текст ----------

def split_message(message: str) -> tuple[str, str]:
    """Эхний мөр → гарчиг (≤200), үлдсэн → бие. Урт ганц мөрийг үгээр нь тасална."""
    text_ = message.strip()
    if not text_:
        return DEFAULT_TITLE, ""
    first, _, rest = text_.partition("\n")
    first = first.strip()
    if len(first) > 120:
        cut = first[:120].rsplit(" ", 1)[0]
        return f"{cut}…", text_
    return first, rest.strip()


def body_html(rest: str, permalink: str) -> str:
    paras = [p.strip() for p in re.split(r"\n\s*\n", rest) if p.strip()]
    out = ["<p>" + html.escape(p).replace("\n", "<br>") + "</p>" for p in paras]
    out.append(f'<p><a href="{html.escape(permalink, quote=True)}">Facebook дээр үзэх</a></p>')
    return "".join(out)


def excerpt_of(rest: str) -> str:
    """Гарчгийн дараах текст; нэг мөрт нийтлэлд хоосон (гарчгийг давтахгүй)."""
    t = re.sub(r"\s+", " ", rest).strip()
    return t if len(t) <= 280 else t[:279].rsplit(" ", 1)[0] + "…"


# ---------- Sync ----------

async def upsert(db: AsyncSession, client: httpx.AsyncClient, p: dict, post: Post | None) -> str:
    """'created' | 'updated' | 'unchanged' | 'skipped' (сайтаас Facebook руу нийтэлсэн эсвэл админ гараар өөрчилсөн мэдээ)."""
    fb_id = p["id"]
    if post is not None and (post.fb_sync_detached or not post.slug.endswith(fb_slug_suffix(fb_id))):
        return "skipped"
    title, rest = split_message(p.get("message") or p.get("story") or "")
    permalink = p.get("permalink_url") or f"https://www.facebook.com/{fb_id}"
    images = [rel for rel in [await download_image(client, u) for u in image_urls(p)] if rel]
    fields = {
        "title": title[:200],
        "excerpt": excerpt_of(rest),
        "body_html": body_html(rest, permalink),
        "cover_image": images[0] if images else None,
        "published_at": datetime.fromisoformat(p["created_time"].replace("+0000", "+00:00")),
    }
    gallery = images[1:]

    if post is None:
        post = Post(slug=f"{slugify(title)[:170]}{fb_slug_suffix(fb_id)}", fb_post_id=fb_id, is_published=True, **fields)
        post.images = [PostImage(image=rel, order=i) for i, rel in enumerate(gallery)]
        db.add(post)
        return "created"

    changed = not post.is_published
    post.is_published = True
    for k, v in fields.items():
        if getattr(post, k) != v:
            setattr(post, k, v)
            changed = True
    if [i.image for i in post.images] != gallery:
        post.images = [PostImage(image=rel, order=i) for i, rel in enumerate(gallery)]
        changed = True
    return "updated" if changed else "unchanged"


async def sync_once(max_pages: int = 1) -> dict[str, int] | None:
    """Нэг удаагийн sync. Өөр процесс ажиллаж байвал None."""
    stats = {"created": 0, "updated": 0, "unchanged": 0, "skipped": 0, "hidden": 0}
    async with SessionLocal() as db:
        if not (await db.execute(text("select pg_try_advisory_xact_lock(:k)"), {"k": LOCK_KEY})).scalar():
            return None
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            fb_posts = await fetch_posts(client, max_pages)
            ids = [p["id"] for p in fb_posts]
            existing = {x.fb_post_id: x for x in (await db.execute(select(Post).where(Post.fb_post_id.in_(ids)))).scalars()} if ids else {}
            ignored = set((await db.execute(select(FbIgnoredPost.fb_post_id).where(FbIgnoredPost.fb_post_id.in_(ids)))).scalars()) if ids else set()
            for p in fb_posts:
                stats["skipped" if p["id"] in ignored else await upsert(db, client, p, existing.get(p["id"]))] += 1

        # Татсан хүрээнд (хамгийн хуучин татсан нийтлэлээс хойш) Facebook дээр байхгүй болсон sync-ийн мэдээг нууна.
        if fb_posts:
            oldest = min(datetime.fromisoformat(p["created_time"].replace("+0000", "+00:00")) for p in fb_posts)
            q = select(Post).where(Post.fb_post_id.is_not(None), Post.fb_sync_detached.is_(False), Post.is_published.is_(True),
                                   Post.published_at >= oldest)
            for post in (await db.execute(q)).scalars():
                if post.fb_post_id not in ids and post.slug.endswith(fb_slug_suffix(post.fb_post_id)):
                    post.is_published = False
                    stats["hidden"] += 1
        await db.commit()
    return stats


async def run_forever() -> None:
    """main.py lifespan-аас эхэлнэ. Алдаа гарвал логлоод дараагийн удаа дахин оролдоно."""
    interval = settings.fb_sync_interval_minutes * 60
    first = True
    while True:
        try:
            stats = await sync_once(max_pages=4 if first else 1)
            if stats and (stats["created"] or stats["updated"] or stats["hidden"]):
                log.info("Facebook sync: %s", stats)
            first = False
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("Facebook sync амжилтгүй")
        await asyncio.sleep(interval)


if __name__ == "__main__":
    import app.models_all  # noqa: F401  — FK-уудын хүснэгтүүд metadata-д бүртгэгдэнэ

    ap = argparse.ArgumentParser(description="Facebook Page → мэдээний булан sync (нэг удаа).")
    ap.add_argument("--backfill", action="store_true", help="Page-ийн бүх түүхийг татна (40 × 25 нийтлэл хүртэл)")
    args = ap.parse_args()
    if not (settings.fb_page_id and settings.fb_page_access_token):
        raise SystemExit("FB_PAGE_ID, FB_PAGE_ACCESS_TOKEN тохируулаагүй байна.")
    print(asyncio.run(sync_once(max_pages=40 if args.backfill else 1)))
