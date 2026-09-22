from pydantic import BaseModel, Field, field_validator


class LoginIn(BaseModel):
    username: str
    password: str


class RefreshIn(BaseModel):
    refresh: str


class TokenPair(BaseModel):
    access: str
    refresh: str


class MeOut(BaseModel):
    id: int
    username: str
    full_name: str
    email: str
    is_staff: bool
    is_superuser: bool
    roles: list[str]


class UserOut(MeOut):
    is_active: bool


def _password_max_bytes(v: str | None) -> str | None:
    if v is not None and len(v.encode("utf-8")) > 72:
        raise ValueError("Нууц үг 72 байтаас урт байж болохгүй.")
    return v


class UserIn(BaseModel):
    username: str = Field(min_length=1, max_length=150)
    password: str = Field(min_length=6)
    full_name: str = ""
    email: str = ""
    is_active: bool = True
    is_superuser: bool = False
    roles: list[str] = []

    @field_validator("password")
    @classmethod
    def _password_max_bytes(cls, v):
        return _password_max_bytes(v)


class UserPatch(BaseModel):
    username: str | None = Field(default=None, min_length=1, max_length=150)
    password: str | None = Field(default=None, min_length=6)
    full_name: str | None = None
    email: str | None = None
    is_active: bool | None = None
    is_superuser: bool | None = None
    roles: list[str] | None = None

    @field_validator("password")
    @classmethod
    def _password_max_bytes(cls, v):
        return _password_max_bytes(v)


class RoleOut(BaseModel):
    code: str
    name: str
