from pydantic import BaseModel, Field


class CatalogueItem(BaseModel):
    code: str
    name: str
    numeric: str
    continent: str
    coords: list[float]      # [уртраг, өргөрөг]


class DestinationOut(CatalogueItem):
    id: int
    universities: list[str]
    order: int


class DestinationIn(BaseModel):
    code: str = ""
    universities: list[str] = Field(default_factory=list)


class DestinationPatch(BaseModel):
    universities: list[str] | None = None


class OrderIn(BaseModel):
    ids: list[int]


class StatsOut(BaseModel):
    total_graduates: int
    university_percent: int
    university_count: int
    abroad_count: int


class StatsPatch(BaseModel):
    total_graduates: int | None = None
    university_percent: int | None = None
    university_count: int | None = None
    abroad_count: int | None = None
