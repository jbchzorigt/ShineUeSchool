"""Тохиргоо .env.example-оос уншигдаж байгааг шалгана (CORS_ORIGINS таслалтай мөр)."""
from pathlib import Path

import pytest

from app.config import BASE_DIR, Settings


def test_env_example_loads(tmp_path):
    src = (BASE_DIR / ".env.example").read_text(encoding="utf-8")
    env = tmp_path / ".env"
    env.write_text(src, encoding="utf-8")
    s = Settings(_env_file=env)
    assert s.cors_origins == [
        "http://localhost:3000", "http://127.0.0.1:3000",
        "http://localhost:5173", "http://127.0.0.1:5173",
    ]
    assert s.access_ttl_hours == 8 and s.refresh_ttl_days == 14


def test_insecure_secret_key_rejected_outside_localhost():
    with pytest.raises(RuntimeError):
        Settings(secret_key="dev-insecure-x", database_url="postgresql+asyncpg://u:p@db.example.com/x", _env_file=None)


def test_insecure_secret_key_allowed_on_localhost():
    Settings(secret_key="dev-insecure-x", database_url="postgresql+asyncpg://u:p@localhost/x", _env_file=None)


def test_database_url_scheme_normalized():
    """Railway/Heroku маягийн postgresql:// (эсвэл postgres://) хаягийг asyncpg драйвер руу хөрвүүлнэ."""
    s = Settings(secret_key="x" * 40, database_url="postgresql://u:p@db.example.com:5432/x", _env_file=None)
    assert s.database_url == "postgresql+asyncpg://u:p@db.example.com:5432/x"
    s = Settings(secret_key="x" * 40, database_url="postgres://u:p@db.example.com/x", _env_file=None)
    assert s.database_url == "postgresql+asyncpg://u:p@db.example.com/x"
    s = Settings(secret_key="x" * 40, database_url="postgresql+asyncpg://u:p@db.example.com/x", _env_file=None)
    assert s.database_url == "postgresql+asyncpg://u:p@db.example.com/x"
