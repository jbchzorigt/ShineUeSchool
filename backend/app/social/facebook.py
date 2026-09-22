"""Facebook Graph API клиент. Тестэд get_facebook-ийг FakeFacebook-оор override хийнэ."""

import httpx
from fastapi import HTTPException, status

from ..config import settings

GRAPH = "https://graph.facebook.com/v21.0"


class FacebookError(Exception):
    pass


class FacebookClient:
    def __init__(self, app_id: str, app_secret: str, page_id: str, page_token: str):
        self.app_id, self.app_secret, self.page_id, self.page_token = app_id, app_secret, page_id, page_token

    async def _get(self, path: str, params: dict) -> dict:
        try:
            async with httpx.AsyncClient(timeout=10) as c:
                r = await c.get(f"{GRAPH}{path}", params=params)
            data = r.json()
        except (httpx.HTTPError, ValueError) as e:
            raise FacebookError(f"Graph API холболт: {e}") from None
        if r.status_code >= 400 or "error" in data:
            raise FacebookError(data.get("error", {}).get("message", f"Graph API алдаа ({r.status_code})"))
        return data

    async def debug_token(self, token: str) -> dict:
        result = await self._get("/debug_token", {"input_token": token, "access_token": f"{self.app_id}|{self.app_secret}"})
        data = result.get("data")
        if data is None:
            raise FacebookError("Graph API хариу буруу.")
        if not data.get("is_valid") or str(data.get("app_id")) != str(self.app_id):
            raise FacebookError("Токен хүчингүй.")
        return data

    async def me(self, token: str) -> dict:
        d = await self._get("/me", {"fields": "id,name,picture.width(200)", "access_token": token})
        user_id = d.get("id")
        if user_id is None:
            raise FacebookError("Graph API хариу буруу.")
        return {"id": user_id, "name": d.get("name", ""), "picture_url": d.get("picture", {}).get("data", {}).get("url", "")}

    async def post_to_page(self, message: str, link: str) -> str:
        try:
            async with httpx.AsyncClient(timeout=15) as c:
                r = await c.post(f"{GRAPH}/{self.page_id}/feed", data={"message": message, "link": link, "access_token": self.page_token})
            data = r.json()
        except (httpx.HTTPError, ValueError) as e:
            raise FacebookError(f"Graph API холболт: {e}") from None
        if r.status_code >= 400 or "error" in data:
            raise FacebookError(data.get("error", {}).get("message", f"Graph API алдаа ({r.status_code})"))
        post_id = data.get("id")
        if post_id is None:
            raise FacebookError("Graph API хариу буруу.")
        return post_id


def get_facebook() -> FacebookClient:
    if not settings.fb_enabled:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Facebook холболт тохируулагдаагүй.")
    return FacebookClient(settings.fb_app_id, settings.fb_app_secret, settings.fb_page_id, settings.fb_page_access_token)
