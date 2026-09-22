"""Дугуйлан: mailer, олон нийтийн жагсаалт, код, бүртгэл."""

import logging

import pytest

from app.clubs import mailer


async def test_send_code_logs_when_smtp_not_configured(monkeypatch, caplog):
    from app.config import settings
    monkeypatch.setattr(settings, "smtp_host", "")
    with caplog.at_level(logging.WARNING, logger="app.clubs.mailer"):
        await mailer.send_code("bat@shineue.edu.mn", "123456")
    assert "123456" in caplog.text and "bat@shineue.edu.mn" in caplog.text


async def test_send_code_uses_smtp(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "smtp_host", "smtp.example.com")
    monkeypatch.setattr(settings, "smtp_from", "noreply@shineue.edu.mn")
    monkeypatch.setattr(settings, "smtp_user", "u")
    monkeypatch.setattr(settings, "smtp_password", "p")
    calls: list = []

    class FakeSMTP:
        def __init__(self, host, port, timeout=None): calls.append(("connect", host, port))
        def __enter__(self): return self
        def __exit__(self, *a): calls.append(("quit",))
        def starttls(self): calls.append(("tls",))
        def login(self, u, p): calls.append(("login", u, p))
        def send_message(self, msg): calls.append(("send", msg["To"], msg["From"], msg.get_content()))

    monkeypatch.setattr(mailer.smtplib, "SMTP", FakeSMTP)
    await mailer.send_code("bat@shineue.edu.mn", "654321")
    assert calls[0] == ("connect", "smtp.example.com", 587) and ("tls",) in calls and ("login", "u", "p") in calls
    sent = next(c for c in calls if c[0] == "send")
    assert sent[1] == "bat@shineue.edu.mn" and sent[2] == "noreply@shineue.edu.mn" and "654321" in sent[3]


async def test_send_code_smtp_failure_raises(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "smtp_host", "smtp.example.com")
    monkeypatch.setattr(settings, "smtp_from", "noreply@shineue.edu.mn")

    class Broken:
        def __init__(self, *a, **k): raise OSError("connection refused")

    monkeypatch.setattr(mailer.smtplib, "SMTP", Broken)
    with pytest.raises(mailer.MailError):
        await mailer.send_code("bat@shineue.edu.mn", "111111")


from tests.helpers import seed_clubs


async def test_public_list_filters_and_state(client, db):
    s = await seed_clubs(db)
    r = await client.get("/api/clubs/")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["round"]["name"] == "2026–2027 намар"
    names = [c["name"] for c in body["clubs"]]
    assert names == ["Шатар", "Робот", "Дуу", "Зураг"]
    by = {c["name"]: c for c in body["clubs"]}
    ch = by["Шатар"]
    assert ch["state"] == "open" and ch["capacity"] == 5 and ch["taken"] == 0 and ch["slots_left"] == 5
    assert ch["grades"] == [5, 6, 7, 8]
    assert ch["quotas"] == [{"grade": 5, "capacity": 2, "taken": 0, "slots_left": 2, "full": False},
                            {"grade": 6, "capacity": 1, "taken": 0, "slots_left": 1, "full": False},
                            {"grade": 7, "capacity": 1, "taken": 0, "slots_left": 1, "full": False},
                            {"grade": 8, "capacity": 1, "taken": 0, "slots_left": 1, "full": False}]
    assert by["Дуу"]["state"] == "upcoming" and by["Зураг"]["state"] == "closed"
    assert by["Робот"]["is_paid"] and by["Робот"]["fee"] == 150000 and by["Робот"]["capacity"] == 2
    r = await client.get("/api/clubs/?grade=5")
    assert [c["name"] for c in r.json()["clubs"]] == ["Шатар", "Зураг"]
    r = await client.get("/api/clubs/?grade=12")
    assert r.json()["clubs"] == [] and r.json()["round"]["id"] == s.round_id


async def test_public_list_no_active_round(client, db):
    r = await client.get("/api/clubs/")
    assert r.status_code == 200 and r.json() == {"round": None, "clubs": []}


async def test_public_list_full_state_and_taken(client, db):
    from app.clubs.models import ClubRegistration
    s = await seed_clubs(db)

    def reg(email, grade, **over):
        d = dict(club_id=s.robot_id, round_id=s.round_id, email=email, student_last_name="Б", student_first_name="Бат",
                 guardian_last_name="Д", guardian_first_name="Дорж", phone="99001122", grade=grade)
        d.update(over)
        return ClubRegistration(**d)

    db.add(reg("a@shineue.edu.mn", 9))
    db.add(reg("b@shineue.edu.mn", 9, status="removed"))
    await db.flush()
    by = {c["name"]: c for c in (await client.get("/api/clubs/")).json()["clubs"]}
    rb = by["Робот"]
    assert rb["taken"] == 1 and rb["slots_left"] == 1 and rb["state"] == "open"     # 9-р анги дүүрсэн, 10-р нээлттэй
    assert rb["quotas"][0] == {"grade": 9, "capacity": 1, "taken": 1, "slots_left": 0, "full": True}
    assert rb["quotas"][1]["full"] is False
    db.add(reg("c@shineue.edu.mn", 10))
    await db.flush()
    rb = {c["name"]: c for c in (await client.get("/api/clubs/")).json()["clubs"]}["Робот"]
    assert rb["state"] == "full" and rb["slots_left"] == 0 and all(q["full"] for q in rb["quotas"])


def test_club_state_closed_beats_full():
    from datetime import UTC, datetime, timedelta
    from types import SimpleNamespace

    from app.clubs.service import club_state
    now = datetime.now(UTC)
    c = SimpleNamespace(quotas={"5": 1, "6": 1}, registration_start=now - timedelta(days=2), registration_end=now - timedelta(days=1))
    assert club_state(c, {5: 1, 6: 1}, now) == "closed"
    c.registration_end = now + timedelta(days=1)
    assert club_state(c, {5: 1, 6: 1}, now) == "full"
    assert club_state(c, {5: 1}, now) == "open"           # 6-р анги нээлттэй
    assert club_state(c, {}, now) == "open"
    c.quotas = {}
    assert club_state(c, {}, now) == "full"                # квотгүй бол бүртгэл авахгүй тул "дүүрсэн"
    c.registration_start = now + timedelta(hours=1)
    assert club_state(c, {}, now) == "upcoming"


from tests.helpers import get_code

SEND = "/api/clubs/email/send/"
VERIFY = "/api/clubs/email/verify/"


async def test_send_code_domain_and_round_checks(client, db, sent_codes):
    r = await client.post(SEND, json={"email": "bat@gmail.com"})
    assert r.status_code == 400 and "shineue.edu.mn" in r.json()["email"][0]
    r = await client.post(SEND, json={"email": "bat@shineue.edu.mn"})
    assert r.status_code == 400 and "нээгдээгүй" in r.json()["email"][0]     # идэвхтэй ээлж байхгүй
    assert sent_codes == []
    await seed_clubs(db)
    r = await client.post(SEND, json={"email": "  Bat@Shineue.edu.mn "})
    assert r.status_code == 200 and r.json() == {"ok": True, "expires_in": 600}
    assert sent_codes == [("bat@shineue.edu.mn", sent_codes[0][1])] and len(sent_codes[0][1]) == 6


async def test_send_code_rate_limit_and_resend(client, db, sent_codes):
    await seed_clubs(db)
    for _ in range(3):
        assert (await client.post(SEND, json={"email": "bat@shineue.edu.mn"})).status_code == 200
    r = await client.post(SEND, json={"email": "bat@shineue.edu.mn"})
    assert r.status_code == 429 and "Хэт олон" in r.json()["detail"]
    assert len(sent_codes) == 3                                      # 429 үед код илгээгдээгүй
    # Зөвхөн хамгийн сүүлийн код хүчинтэй (санамсаргүй код давхцах магадлал 1e-6 тул хамгаална)
    if sent_codes[0][1] != sent_codes[-1][1]:
        r = await client.post(VERIFY, json={"email": "bat@shineue.edu.mn", "code": sent_codes[0][1]})
        assert r.status_code == 400 and r.json()["code"] == ["Код буруу байна"]
    # 1 цаг өнгөрсөн бол тоолуур шинээр эхэлнэ
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import update

    from app.clubs.models import EmailCode
    await db.execute(update(EmailCode).where(EmailCode.email == "bat@shineue.edu.mn")
                     .values(first_sent_at=datetime.now(UTC) - timedelta(hours=2)))
    await db.flush()
    assert (await client.post(SEND, json={"email": "bat@shineue.edu.mn"})).status_code == 200


async def test_send_code_refuses_when_already_registered(client, db, sent_codes):
    from app.clubs.models import ClubRegistration
    s = await seed_clubs(db)
    db.add(ClubRegistration(club_id=s.chess_id, round_id=s.round_id, email="bat@shineue.edu.mn",
                            student_last_name="Б", student_first_name="Бат", guardian_last_name="Д",
                            guardian_first_name="Дорж", phone="99001122", grade=5))
    await db.flush()
    r = await client.post(SEND, json={"email": "bat@shineue.edu.mn"})
    assert r.status_code == 400 and "Шатар" in r.json()["email"][0] and sent_codes == []


async def test_verify_code_flow(client, db, sent_codes):
    await seed_clubs(db)
    email = "bat@shineue.edu.mn"
    await client.post(SEND, json={"email": email})
    code = get_code(sent_codes, email)
    wrong = "000000" if code != "000000" else "111111"
    r = await client.post(VERIFY, json={"email": email, "code": wrong})
    assert r.status_code == 400 and r.json()["code"] == ["Код буруу байна"]
    r = await client.post(VERIFY, json={"email": email, "code": code})
    assert r.status_code == 200 and r.json()["expires_in"] == 900
    from app.clubs.service import decode_reg_token
    assert decode_reg_token(r.json()["token"]) == email
    # код нэг удаа л ашиглагдана
    r = await client.post(VERIFY, json={"email": email, "code": code})
    assert r.status_code == 400 and "Дахин код" in r.json()["code"][0]
    # хаяг байхгүй
    r = await client.post(VERIFY, json={"email": "x@shineue.edu.mn", "code": "123456"})
    assert r.status_code == 400 and "Дахин код" in r.json()["code"][0]


async def test_verify_code_attempts_and_expiry(client, db, sent_codes):
    await seed_clubs(db)
    email = "bat@shineue.edu.mn"
    await client.post(SEND, json={"email": email})
    code = get_code(sent_codes, email)
    wrong = "000000" if code != "000000" else "111111"
    for _ in range(5):
        assert (await client.post(VERIFY, json={"email": email, "code": wrong})).status_code == 400
    r = await client.post(VERIFY, json={"email": email, "code": code})         # 5 буруугийн дараа зөв код ч хүчингүй
    assert r.status_code == 400 and "Дахин код" in r.json()["code"][0]
    # дахин код авахад attempts тэглэгдэж, шинэ код зөв бол амжилттай болно
    await client.post(SEND, json={"email": email})
    code = get_code(sent_codes, email)
    r = await client.post(VERIFY, json={"email": email, "code": code})
    assert r.status_code == 200
    # хугацаа дууссан
    await client.post(SEND, json={"email": email})
    code = get_code(sent_codes, email)
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import update

    from app.clubs.models import EmailCode
    await db.execute(update(EmailCode).where(EmailCode.email == email).values(expires_at=datetime.now(UTC) - timedelta(minutes=1)))
    await db.flush()
    r = await client.post(VERIFY, json={"email": email, "code": code})
    assert r.status_code == 400 and "Дахин код" in r.json()["code"][0]


async def test_send_code_mail_failure_502(client, db, monkeypatch):
    from app.clubs import mailer, router_public
    router_public._ip_hits.clear()   # sent_codes fixture ашиглаагүй тул энд өөрөө тэглэнэ
    await seed_clubs(db)

    async def _fail(email, code):
        raise mailer.MailError("smtp down")

    monkeypatch.setattr(mailer, "send_code", _fail)
    r = await client.post(SEND, json={"email": "bat@shineue.edu.mn"})
    assert r.status_code == 502 and "Имэйл илгээж чадсангүй" in r.json()["detail"]


async def test_send_code_ip_throttle(client, db, sent_codes, monkeypatch):
    from app.clubs import router_public
    monkeypatch.setattr(router_public, "MAX_SENDS_PER_IP_HOUR", 2)
    await seed_clubs(db)
    assert (await client.post(SEND, json={"email": "bat@shineue.edu.mn"})).status_code == 200
    assert (await client.post(SEND, json={"email": "b@shineue.edu.mn"})).status_code == 200
    r = await client.post(SEND, json={"email": "c@gmail.com"})    # ямар ч хаяг байсан ч IP-ийн хязгаарт хүрсэн
    assert r.status_code == 429 and r.json()["detail"] == "Хэт олон хүсэлт. Дараа дахин оролдоно уу"


REG = "/api/clubs/registrations/"


def reg_body(token, club_id, grade=5, **over):
    d = {"token": token, "club_id": club_id, "grade": grade, "student_last_name": "Бат", "student_first_name": "Дорж",
         "guardian_last_name": "Дорж", "guardian_first_name": "Сүх", "phone": "99001122"}
    d.update(over)
    return d


def tok(email):
    from app.clubs.service import create_reg_token
    return create_reg_token(email)


async def test_register_success_and_slot(client, db):
    s = await seed_clubs(db)
    r = await client.post(REG, json=reg_body(tok("bat@shineue.edu.mn"), s.chess_id, 6))
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["club"] == {"id": s.chess_id, "name": "Шатар", "is_paid": False, "fee": 0, "fee_note": ""}
    assert body["email"] == "bat@shineue.edu.mn" and body["grade"] == 6
    ch = {c["name"]: c for c in (await client.get("/api/clubs/")).json()["clubs"]}["Шатар"]
    assert ch["taken"] == 1 and ch["slots_left"] == 4 and ch["state"] == "open"
    q6 = next(q for q in ch["quotas"] if q["grade"] == 6)
    assert q6 == {"grade": 6, "capacity": 1, "taken": 1, "slots_left": 0, "full": True}


async def test_register_grade_quota_full(client, db):
    s = await seed_clubs(db)
    assert (await client.post(REG, json=reg_body(tok("a@shineue.edu.mn"), s.chess_id, 6))).status_code == 201
    r = await client.post(REG, json=reg_body(tok("b@shineue.edu.mn"), s.chess_id, 6))
    assert r.status_code == 400 and r.json()["grade"] == ["6-р ангид суудал дүүрсэн"]
    assert (await client.post(REG, json=reg_body(tok("b@shineue.edu.mn"), s.chess_id, 5))).status_code == 201   # өөр анги нээлттэй


async def test_register_rejections(client, db):
    s = await seed_clubs(db)
    t = tok("bat@shineue.edu.mn")
    r = await client.post(REG, json=reg_body("bad.token", s.chess_id))
    assert r.status_code == 401 and "Кодоо дахин" in r.json()["detail"]
    from app.auth.security import create_token
    r = await client.post(REG, json=reg_body(create_token(1, "access"), s.chess_id))   # scope зөрсөн
    assert r.status_code == 401
    r = await client.post(REG, json=reg_body(t, 999999))
    assert r.status_code == 400 and r.json()["club"] == ["Дугуйлан олдсонгүй"]
    r = await client.post(REG, json=reg_body(t, s.hidden_id))
    assert r.status_code == 400 and r.json()["club"] == ["Дугуйлан олдсонгүй"]
    r = await client.post(REG, json=reg_body(t, s.song_id, 2))
    assert r.status_code == 400 and r.json()["club"] == ["Бүртгэл хараахан эхлээгүй"]
    r = await client.post(REG, json=reg_body(t, s.draw_id, 5))
    assert r.status_code == 400 and r.json()["club"] == ["Бүртгэлийн хугацаа дууссан"]
    r = await client.post(REG, json=reg_body(t, s.chess_id, 3))
    assert r.status_code == 400 and r.json()["grade"] == ["Энэ дугуйлан 3-р ангид зориулагдаагүй"]
    r = await client.post(REG, json=reg_body(t, s.chess_id, 5, student_first_name="  "))
    assert r.status_code == 400 and "student_first_name" in r.json()
    r = await client.post(REG, json=reg_body(t, s.chess_id, 5, phone="12"))
    assert r.status_code == 400 and "phone" in r.json()


async def test_register_expired_token_401(client, db):
    import jwt
    from datetime import UTC, datetime, timedelta

    from app.config import settings
    s = await seed_clubs(db)
    now = datetime.now(UTC)
    expired = jwt.encode({"sub": "x@shineue.edu.mn", "scope": "club-reg", "iat": now - timedelta(hours=1),
                          "exp": now - timedelta(minutes=1)}, settings.secret_key, algorithm="HS256")
    r = await client.post(REG, json=reg_body(expired, s.chess_id))
    assert r.status_code == 401


async def test_register_duplicate_full_and_readd_after_remove(client, db):
    s = await seed_clubs(db)
    assert (await client.post(REG, json=reg_body(tok("a@shineue.edu.mn"), s.robot_id, 9))).status_code == 201
    r = await client.post(REG, json=reg_body(tok("a@shineue.edu.mn"), s.chess_id, 5))    # ижил имэйл өөр дугуйлан
    assert r.status_code == 400 and "Робот" in r.json()["email"][0]
    r = await client.post(REG, json=reg_body(tok("b@shineue.edu.mn"), s.robot_id, 9))    # 9-р ангийн квот 1 → дүүрсэн
    assert r.status_code == 400 and r.json()["grade"] == ["9-р ангид суудал дүүрсэн"]
    assert (await client.post(REG, json=reg_body(tok("b@shineue.edu.mn"), s.robot_id, 10))).status_code == 201  # 10-р анги нээлттэй
    from datetime import UTC, datetime

    from sqlalchemy import update

    from app.clubs.models import ClubRegistration
    await db.execute(update(ClubRegistration).where(ClubRegistration.email == "a@shineue.edu.mn")
                     .values(status="removed", removed_at=datetime.now(UTC)))
    await db.flush()
    assert (await client.post(REG, json=reg_body(tok("c@shineue.edu.mn"), s.robot_id, 9))).status_code == 201
    assert (await client.post(REG, json=reg_body(tok("a@shineue.edu.mn"), s.chess_id, 5))).status_code == 201


async def test_register_round_inactive_hides_club(client, db):
    from sqlalchemy import update

    from app.clubs.models import ClubRound
    s = await seed_clubs(db)
    await db.execute(update(ClubRound).where(ClubRound.id == s.round_id).values(is_active=False))
    await db.flush()
    r = await client.post(REG, json=reg_body(tok("a@shineue.edu.mn"), s.chess_id, 5))
    assert r.status_code == 400 and r.json()["club"] == ["Дугуйлан олдсонгүй"]


async def test_register_last_slot_race(engine):
    """Хоёр хүсэлт зэрэг сүүлийн 1 слот руу: нэг нь 201, нөгөө нь 400. Тусдаа connection-уудаар (FOR UPDATE)."""
    import asyncio
    from datetime import UTC, datetime, timedelta

    from httpx import ASGITransport, AsyncClient
    from sqlalchemy import delete
    from sqlalchemy.ext.asyncio import async_sessionmaker

    from app.clubs.models import Club, ClubRegistration, ClubRound
    from app.db import get_db
    from app.main import app

    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _get_db():
        async with maker() as s:
            yield s

    now = datetime.now(UTC)
    async with maker() as s:
        rnd = ClubRound(name="race", is_active=True)
        s.add(rnd)
        await s.flush()
        club = Club(round_id=rnd.id, name="Race", grades=[5], quotas={"5": 1}, registration_start=now - timedelta(days=1),
                    registration_end=now + timedelta(days=1), is_published=True)
        s.add(club)
        await s.commit()
        rid, cid = rnd.id, club.id

    app.dependency_overrides[get_db] = _get_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            r1, r2 = await asyncio.gather(
                c.post(REG, json=reg_body(tok("r1@shineue.edu.mn"), cid, 5)),
                c.post(REG, json=reg_body(tok("r2@shineue.edu.mn"), cid, 5)),
            )
        assert sorted([r1.status_code, r2.status_code]) == [201, 400], (r1.text, r2.text)
        assert "суудал дүүрсэн" in (r1.text + r2.text)
    finally:
        app.dependency_overrides.clear()
        async with maker() as s:
            await s.execute(delete(ClubRegistration).where(ClubRegistration.club_id == cid))
            await s.execute(delete(Club).where(Club.id == cid))
            await s.execute(delete(ClubRound).where(ClubRound.id == rid))
            await s.commit()
