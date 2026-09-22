from pydantic import BaseModel

from ..news.schemas import VisitorOut


class FbStatus(BaseModel):
    enabled: bool
    app_id: str
    page_url: str


class FbLoginIn(BaseModel):
    access_token: str


class FbLoginOut(BaseModel):
    token: str
    visitor: VisitorOut
