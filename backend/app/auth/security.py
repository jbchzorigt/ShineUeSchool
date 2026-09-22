"""Нууц үгийн hash (PBKDF2-SHA256) ба JWT (HS256)."""

import base64
import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
from typing import Literal

import jwt

from ..config import settings

TokenKind = Literal["access", "refresh"]

PBKDF2_ITERATIONS = 600_000
_ALGO = "pbkdf2_sha256"
MAX_PASSWORD_BYTES = 72  # бодлого хэвээр (өмнөх bcrypt-ийн хязгаартай ижил)


def hash_password(password: str) -> str:
    """pbkdf2_sha256$<iterations>$<salt_b64>$<hash_b64>"""
    if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise ValueError("Нууц үг 72 байтаас урт байж болохгүй.")
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"{_ALGO}${PBKDF2_ITERATIONS}${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algo, iters, salt_b64, hash_b64 = password_hash.split("$", 3)
        if algo != _ALGO:
            return False
        salt, expected = base64.b64decode(salt_b64), base64.b64decode(hash_b64)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iters))
        return hmac.compare_digest(digest, expected)
    except (ValueError, TypeError):
        return False


def create_token(user_id: int, kind: TokenKind) -> str:
    now = datetime.now(UTC)
    ttl = timedelta(hours=settings.access_ttl_hours) if kind == "access" else timedelta(days=settings.refresh_ttl_days)
    # jti: нэг секундэд үүссэн хоёр токен ч өөр байх (refresh rotation тест)
    payload = {"sub": str(user_id), "type": kind, "iat": now, "exp": now + ttl, "jti": secrets.token_hex(8)}
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def decode_token(token: str) -> dict:
    """Хугацаа дууссан, буруу гарын үсэгтэй бол jwt.PyJWTError шидэгдэнэ."""
    return jwt.decode(token, settings.secret_key, algorithms=["HS256"])
