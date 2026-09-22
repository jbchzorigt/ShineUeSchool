"""Файл хадгалах (MEDIA_DIR). Зургийг uuid нэрээр хадгална."""

import io
import uuid
from pathlib import Path

from fastapi import UploadFile
from PIL import Image

from ..config import settings
from .errors import FieldError

ALLOWED = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}
MAX_BYTES = 10 * 1024 * 1024


async def save_upload(upload: UploadFile, subdir: str, field: str = "image") -> str:
    """Зургийг шалгаад хадгална; MEDIA_DIR-ээс хамаарах зам ("album/uuid.jpg") буцаана."""
    data = await upload.read()
    if len(data) > MAX_BYTES:
        raise FieldError(field, "Зураг 10 MB-аас том байж болохгүй.")
    try:
        with Image.open(io.BytesIO(data)) as im:
            fmt = im.format
    except Exception:
        fmt = None
    if fmt not in ALLOWED:
        raise FieldError(field, "Зөвхөн JPG, PNG, WebP зураг хүлээн авна.")
    rel = f"{subdir}/{uuid.uuid4().hex}{ALLOWED[fmt]}"
    path: Path = settings.media_dir / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return rel


def delete_file(rel: str) -> None:
    p = settings.media_dir / rel
    if p.is_file():
        p.unlink()
