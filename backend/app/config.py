"""Тохиргоо: орчны хувьсагч эсвэл backend/.env файлаас уншина."""

import logging
from pathlib import Path
from typing import Annotated

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://shineue:shineue@localhost:5432/shineue"
    database_url_test: str = "postgresql+asyncpg://shineue:shineue@localhost:5432/shineue_test"
    secret_key: str = "dev-insecure-change-me-dev-insecure-change-me-0000"
    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:3000", "http://127.0.0.1:3000",
        "http://localhost:5173", "http://127.0.0.1:5173",
    ]
    media_dir: Path = BASE_DIR / "media"
    access_ttl_hours: int = 8
    refresh_ttl_days: int = 14

    # Facebook (хоосон бол Facebook функцууд идэвхгүй)
    fb_app_id: str = ""
    fb_app_secret: str = ""
    fb_page_id: str = ""
    fb_page_access_token: str = ""
    # Олон нийтийн сайтын хаяг: share холбоос, OG, Facebook постын link
    public_site_url: str = "http://localhost:3000"
    visitor_ttl_days: int = 30
    # Олон нийтэд харагдах backend-ийн хаяг (media URL-д ашиглана); хоосон бол request.base_url ашиглана
    media_base_url: str = ""

    # Имэйл (дугуйлангийн бүртгэлийн код). smtp_host, smtp_from хоосон бол код серверийн логт хэвлэгдэнэ.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_tls: bool = True
    # Дугуйлангийн бүртгэл
    club_email_domain: str = "shineue.edu.mn"
    club_code_ttl_minutes: int = 10
    club_token_ttl_minutes: int = 15

    @property
    def fb_enabled(self) -> bool:
        return all([self.fb_app_id, self.fb_app_secret, self.fb_page_id, self.fb_page_access_token])

    @property
    def mail_enabled(self) -> bool:
        return bool(self.smtp_host and self.smtp_from)

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split(cls, v):
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return v

    @field_validator("media_dir", mode="before")
    @classmethod
    def _abs(cls, v):
        p = Path(v)
        return p if p.is_absolute() else BASE_DIR / p

    @model_validator(mode="after")
    def _check_secret_key(self) -> "Settings":
        if self.secret_key.startswith("dev-insecure"):
            logger.warning("SECRET_KEY нь хөгжүүлэлтийн анхдагч утга байна — production дээр солино уу.")
            if "localhost" not in self.database_url and "127.0.0.1" not in self.database_url:
                raise RuntimeError(
                    "Production дээр SECRET_KEY-г .env файлд заавал тохируулна (dev-insecure-* хориотой)."
                )
        return self


settings = Settings()
