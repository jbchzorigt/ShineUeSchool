"""
Superuser үүсгэнэ (Django-ийн createsuperuser-ийн оронд).

    uv run python scripts/create_admin.py admin "Нууц үг" --name "Админ" --email admin@example.com
"""

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.auth.models import User  # noqa: E402
from app.auth.security import hash_password  # noqa: E402
from app.db import SessionLocal  # noqa: E402


async def main(username: str, password: str, name: str, email: str) -> None:
    async with SessionLocal() as db:
        existing = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
        if existing:
            print(f"'{username}' хэрэглэгч аль хэдийн байна.")
            return
        db.add(User(username=username, password_hash=hash_password(password), full_name=name or username,
                    email=email, is_superuser=True, is_active=True))
        await db.commit()
        print(f"Superuser '{username}' үүслээ.")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("username")
    p.add_argument("password")
    p.add_argument("--name", default="")
    p.add_argument("--email", default="")
    a = p.parse_args()
    asyncio.run(main(a.username, a.password, a.name, a.email))
