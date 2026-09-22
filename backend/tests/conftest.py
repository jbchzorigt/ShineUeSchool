"""
Тестийн суурь. Тестийн бааз (DATABASE_URL_TEST) дээр хүснэгтүүдийг үүсгээд,
тест бүрийг transaction дотор ажиллуулж, дуусахад rollback хийнэ.
"""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.db import Base, get_db
from app.main import app
from app import models_all  # noqa: F401


@pytest.fixture(scope="session")
async def engine():
    assert "test" in settings.database_url_test, "DATABASE_URL_TEST нь тестийн бааз байх ёстой (нэрэнд 'test' орсон)"
    eng = create_async_engine(settings.database_url_test)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest.fixture
async def db(engine) -> AsyncSession:
    """Тест бүрт нэг connection + гадна transaction; session нь savepoint ашиглана."""
    async with engine.connect() as conn:
        trans = await conn.begin()
        maker = async_sessionmaker(conn, expire_on_commit=False, join_transaction_mode="create_savepoint")
        async with maker() as session:
            yield session
        await trans.rollback()


@pytest.fixture
async def client(db: AsyncSession):
    async def _override():
        yield db

    app.dependency_overrides[get_db] = _override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


from sqlalchemy import select

from app.auth.models import Role, User
from app.auth.security import hash_password


@pytest.fixture
async def make_user(db):
    """make_user("bat", roles=["manager"]) → User. Role байхгүй бол үүсгэнэ."""
    async def _make(username, password="pass1234", *, superuser=False, roles=()):
        role_objs = []
        for code in roles:
            r = (await db.execute(select(Role).where(Role.code == code))).scalar_one_or_none()
            if r is None:
                r = Role(code=code, name=code)
                db.add(r)
            role_objs.append(r)
        u = User(username=username, password_hash=hash_password(password), full_name=username,
                 email=f"{username}@example.com", is_superuser=superuser, roles=role_objs)
        db.add(u)
        await db.flush()
        return u
    return _make


@pytest.fixture
async def fb(monkeypatch):
    """Facebook идэвхтэй мэт тохируулж, FacebookClient-ийг FakeFacebook-оор солино."""
    from app.config import settings
    from app.social.facebook import get_facebook
    from tests.helpers import FakeFacebook
    for k in ("fb_app_id", "fb_app_secret", "fb_page_id", "fb_page_access_token"):
        monkeypatch.setattr(settings, k, "x")
    fake = FakeFacebook()
    app.dependency_overrides[get_facebook] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_facebook, None)


@pytest.fixture
async def sent_codes(monkeypatch):
    """mailer.send_code-ийг барьж, илгээсэн (email, code) хосуудыг жагсаалтад хадгална."""
    from app.clubs import mailer, router_public
    router_public._ip_hits.clear()   # per-process IP throttle-ийг тест хооронд тэглэнэ
    sent: list[tuple[str, str]] = []

    async def _fake(email, code):
        sent.append((email, code))

    monkeypatch.setattr(mailer, "send_code", _fake)
    return sent
