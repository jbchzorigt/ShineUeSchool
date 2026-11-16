"""Facebook хуудасны дагагчийн тоо (Graph API: followers_count, fan_count). FB_PAGE_ID ба FB_PAGE_ACCESS_TOKEN тохируулаагүй бол None.
Хүсэлт бүрт Facebook руу явахгүйн тулд 30 минут (алдаа гарвал 5 минут) санах ойд хадгална."""

import logging
import time

import httpx

from ..config import settings

log = logging.getLogger(__name__)
GRAPH = "https://graph.facebook.com/v26.0"
TTL_OK, TTL_ERR = 30 * 60, 5 * 60
_cache: dict[str, tuple[float, dict | None]] = {}


async def facebook_followers() -> dict | None:
    page, token = settings.fb_page_id, settings.fb_page_access_token
    if not page or not token:
        return None
    hit = _cache.get(page)
    if hit and hit[0] > time.monotonic():
        return hit[1]
    data: dict | None = None
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(f"{GRAPH}/{page}", params={"fields": "followers_count,fan_count,name", "access_token": token})
            r.raise_for_status()
            j = r.json()
            data = {"followers": int(j.get("followers_count") or j.get("fan_count") or 0), "name": str(j.get("name") or "")}
    except (httpx.HTTPError, ValueError) as e:
        log.warning("Facebook дагагчийн тоо авч чадсангүй: %s", e)
    _cache[page] = (time.monotonic() + (TTL_OK if data else TTL_ERR), data)
    return data
