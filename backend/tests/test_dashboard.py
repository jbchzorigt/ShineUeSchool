"""Админы нүүр хуудасны тойм: идэвхтэй элсэлтийн хүсэлт, дугуйлангийн бүртгэл, Facebook дагагч, сүүлийн сэтгэгдлүүд — эрхээр шүүнэ."""

from datetime import date, datetime, timedelta, timezone

from app.admissions.models import AdmissionRound, Applicant
from app.news.models import Comment, Post
from tests.helpers import staff_headers

D = "/api/dashboard/"


async def seed(db):
    rnd = AdmissionRound(name="2027 элсэлт", code_prefix="T27", grades=[1, 6], is_active=True, registration_open=True)
    old = AdmissionRound(name="2026 элсэлт", code_prefix="T26", grades=[1], is_active=False)
    db.add_all([rnd, old])
    await db.flush()
    now = datetime.now(timezone.utc)
    for i, (r, status) in enumerate([(rnd, "registered"), (rnd, "registered"), (rnd, "cancelled"), (old, "registered")]):
        db.add(Applicant(round_id=r.id, code=f"T-{i}", email=f"a{i}@example.invalid", child_last_name="Т", child_first_name=f"Хүүхэд{i}",
                         birth_date=date(2020, 1, 1), gender="male", grade=1, guardian_last_name="Т", guardian_first_name="Эцэг",
                         phone="99000000", status=status, consent_at=now))
    post = Post(title="Мэдээ", slug="medee", is_published=True, published_at=now)
    db.add(post)
    await db.flush()
    for i in range(7):
        db.add(Comment(post_id=post.id, author_name=f"Бичигч {i}", body="Сэтгэгдэл " * 30 + str(i), created_at=now - timedelta(hours=7 - i),
                       is_hidden=(i == 6)))
    await db.flush()


async def test_dashboard_sections_follow_permissions(client, make_user, db, monkeypatch):
    await seed(db)
    from app.dashboard import router as dash
    async def no_fb():
        return None
    monkeypatch.setattr(dash, "facebook_followers", no_fb)

    full = await staff_headers(client, make_user, "boss", superuser=True)
    d = (await client.get(D, headers=full)).json()
    assert d["admission"] == {"round": "2027 элсэлт", "applicants": 2, "registration_open": True}   # зөвхөн идэвхтэй ээлж, бүртгэлтэй
    assert len(d["comments"]) == 5 and d["comments"][0]["author_name"] == "Бичигч 6"               # шинэ нь эхэнд, нуугдсан ч харагдана
    assert d["comments"][0]["is_hidden"] is True and d["comments"][0]["post_slug"] == "medee"
    assert len(d["comments"][0]["body"]) <= 201                                                   # урт сэтгэгдэл таслагдана
    assert d["facebook"] is None

    news_only = await staff_headers(client, make_user, "editor", roles=("news.view",))
    d = (await client.get(D, headers=news_only)).json()
    assert d["admission"] is None and d["clubs"] is None and len(d["comments"]) == 5

    adm_only = await staff_headers(client, make_user, "adm", roles=("admissions.view",))
    d = (await client.get(D, headers=adm_only)).json()
    assert d["admission"]["applicants"] == 2 and d["comments"] == []

    assert (await client.get(D)).status_code == 401


async def test_dashboard_facebook_followers(client, make_user, monkeypatch):
    from app.dashboard import router as dash
    async def fb():
        return {"followers": 15234, "name": "Шинэ Үе сургууль"}
    monkeypatch.setattr(dash, "facebook_followers", fb)
    h = await staff_headers(client, make_user, "boss2", superuser=True)
    assert (await client.get(D, headers=h)).json()["facebook"] == {"followers": 15234, "name": "Шинэ Үе сургууль"}


async def test_facebook_followers_not_configured_returns_none(monkeypatch):
    from app.config import settings
    from app.dashboard import facebook
    monkeypatch.setattr(settings, "fb_page_id", "")
    monkeypatch.setattr(settings, "fb_page_access_token", "")
    facebook._cache.clear()
    assert await facebook.facebook_followers() is None
