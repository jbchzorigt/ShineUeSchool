"""
Бодит өгөгдөл — "School Profile 2026-2027" (PDF) ба "2022–2026 оны төгсөгчдийн элсэлт, тэтгэлгийн харьцуулсан тайлан"
(docx)-оос: хөтөлбөр бүрийн хэрэгжилт, шалгалтын дүн, төгсөгчдийн элсэлт, тэтгэлэг; нүүрний төгсөлтийн тоо; 2026 оны
элсэлтийн улс, сургуулиуд. Дахин ажиллуулахад аюулгүй:
  - хөтөлбөр: slug-аар олж нэр/badge/summary/анги/хэрэгжилтийг ЭНЭ өгөгдлөөр солино (--no-programs бол алгасна);
  - тэтгэлэг: жил бүрийн нийт дүнг "YYYY оны төгсөгчид" нэртэй нэг мөрөөр (байвал дахин нэмэхгүй);
    --drop-sample бол жишээ нэртэй (Дорж, Сараа, Бат) тестийн мөрүүдийг устгана;
  - төгсөлтийн тоо: үргэлж бичнэ; улсууд: --reset-countries бол бүх улсыг устгаж дахин үүсгэнэ, үгүй бол байхгүйг л нэмнэ.

    uv run python scripts/seed_profile_2026.py [--drop-sample] [--reset-countries] [--no-programs] [--radar-sample]
"""

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete, func, select  # noqa: E402

from app.db import SessionLocal  # noqa: E402
from app.graduates.models import GraduateCountry  # noqa: E402
from app.graduates.service import get_stats  # noqa: E402
from app.programs.models import Program, Scholarship  # noqa: E402

# ------------------------------------------------------------------ Хөтөлбөрүүд
IB_BODY = """
<h2>Хэрэгжилт</h2>
<p>Шинэ Үе сургууль 2018 онд Монгол Улсад анх удаа <strong>IB Diploma Programme</strong>-ийг хэрэгжүүлж эхэлсэн. Хөтөлбөрийг сонгосон сурагчид 11–12-р ангид хоёр жил суралцаж, олон улсад хүлээн зөвшөөрөгдсөн <strong>IB Diploma</strong>-тай төгсдөг. Cambridge IGCSE (9–10-р анги) нь IB-д бэлтгэх суурь болдог.</p>
<p>Сурагч HL (higher level) ба SL (standard level) түвшний 6 хичээл сонгож, Extended Essay (EE), Theory of Knowledge (TOK), CAS болон хичээл бүрийн Internal Assessment-ийг гүйцэтгэнэ. Эдгээр нь судалгаа, академик бичлэг, шүүмжлэлт сэтгэлгээ, бие даан ажиллах чадварыг хөгжүүлж, гадаадын их сургуулийн элсэлтэд бэлтгэдэг.</p>
<h2>IB шалгалтын дундаж оноо (2024 → 2025 → 2026)</h2>
<ul>
<li>Mongolian Literature: 5.9 → 6.0 → 5.6</li>
<li>English B: 5.2 → 5.2 → 5.2</li>
<li>Mandarin ab initio: 5.3 → 4.6 → 6.0</li>
<li>History: 4.5 → 4.8 → 5.3</li>
<li>Business and Management: 4.6 → 4.5 → 5.0</li>
<li>Chemistry: 3.5 → 3.1 → 4.5</li>
<li>Physics: 3.3 → 2.9 → 3.8</li>
<li>Biology: 3.5 → 3.6 → 4.4</li>
<li>Mathematics: Analysis and Approaches: 3.5 → 3.9 → 3.9</li>
<li>Environmental Systems and Societies: 3.1 (2026 онд анх удаа)</li>
<li>Computer Science: 3.8 (2026 онд анх удаа)</li>
</ul>
<p>2026 онд Mandarin ab initio, Chemistry, Physics, Biology, History, Business and Management хичээлүүдэд мэдэгдэхүйц ахиц гарсан.</p>
<h2>Төгсөгчдийн гадаадын их, дээд сургуульд элссэн байдал (2022–2026)</h2>
<ul>
<li>2022: 14 төгсөгчөөс 10 нь гадаадад элссэн (71.4%)</li>
<li>2023: 16 төгсөгчөөс 14 (87.5%)</li>
<li>2024: 25 төгсөгчөөс 20 (80.0%)</li>
<li>2025: 51 төгсөгчөөс 39 (76.5%)</li>
<li>2026: 63 төгсөгчөөс 40 (63.5%)</li>
<li><strong>Нийт: 169 төгсөгчөөс 123 нь гадаадад элссэн (72.8%)</strong></li>
</ul>
<h2>Тэтгэлэг</h2>
<p>2022–2026 онд IB хөтөлбөрийн төгсөгчид нийт <strong>$24.44 сая</strong> тэтгэлэг хүртсэн нь сургуулийн нийт тэтгэлгийн 87.9% юм. 2026 онд 63 төгсөгч $13.38 сая тэтгэлэг авчээ. Жил бүрийн дүнг доорх графикаас харна уу.</p>
<h2>Юуг анхаарах вэ</h2>
<ul>
<li>IB нь бие даан суралцах, судалгаа хийх, академик бичих, олон ажлыг зэрэг зохицуулах чадвар шаарддаг; суурь мэдлэг, англи хэлний түвшин чухал.</li>
<li>HL/SL хичээлийн сонголтыг ирээдүйд суралцах мэргэжлийн шаардлагатай уялдуулах нь IB авахаас ч илүү чухал.</li>
<li>Их сургуулийн өргөдөлд predicted grade ашиглагддаг тул эцсийн IB дүн хүрэхгүй байх эрсдэлийг тооцно.</li>
<li>Тэтгэлгийг IB Diploma өөрөө баталгаажуулдаггүй: дүн, хэлний түвшин, эсээ, үйл ажиллагаа, их сургуулийн бодлого зэрэг олон хүчин зүйлээс хамаарна.</li>
</ul>
"""

CAMBRIDGE_BODY = """
<h2>Хэрэгжилт</h2>
<p>Шинэ Үе сургууль 2021 оноос <strong>Cambridge International School</strong> болсон. Cambridge хөтөлбөр хоёр шаттай:</p>
<ul>
<li><strong>Cambridge Lower Secondary</strong> — 6–8-р анги; төгсөхөд Cambridge Checkpoint шалгалт өгнө.</li>
<li><strong>Cambridge IGCSE</strong> — 9–10-р анги; төгсөхөд IGCSE шалгалт өгнө.</li>
</ul>
<p>IGCSE нь академик бат суурь өгч, сурагч цаашид Үндэсний цөм хөтөлбөр эсвэл IB Diploma Programme-ийн аль нэгийг сонгон үргэлжлүүлэх боломжтой.</p>
<h2>Cambridge IGCSE-ийн дундаж оноо (2024 → 2025 → 2026)</h2>
<ul>
<li>Biology: 57.0 → 65.1 → 69.5</li>
<li>Business: 70.9 (2026 онд анх удаа)</li>
<li>Chemistry: 67.2 → 66.9 → 68.2</li>
<li>Global Perspectives: 69.0 → 73.5 → 75.5</li>
<li>ICT: 55.0 → 66.8 → 67.4</li>
<li>English: 60.0 → 73.0 → 71.6</li>
<li>Chinese: 81.0 → 86.7 → 91.0</li>
<li>Mathematics: 67.0 → 67.6 → 74.9</li>
<li>Physics: 53.0 → 57.0 → 68.0</li>
<li>Sociology: 60.3 → – → 83.0</li>
<li><strong>Нийт дундаж: 62.4 → 69.6 → 74.0</strong></li>
</ul>
<p>2024–2026 онд ерөнхий дундаж тогтмол өсч, ялангуяа хятад хэл, математик, физик, биологи, Global Perspectives хичээлүүдэд тод ахиц гарсан.</p>
"""

NATIONAL_BODY = """
<h2>Хэрэгжилт</h2>
<p>Монгол Улсын бага, суурь, бүрэн дунд боловсролын <strong>үндэсний цөм хөтөлбөр</strong>-өөр 1–12-р ангид сургалт явуулна. Ахлах ангийн сурагчид Монголын их, дээд сургуулийн бакалаврын хөтөлбөрт элсэхэд шаардлагатай <strong>Элсэлтийн ерөнхий шалгалт</strong>-д бэлтгэгдэнэ. Cambridge IGCSE (9–10-р анги) төгссөн сурагч 11–12-р ангид IB-ийн оронд цөм хөтөлбөрөөр үргэлжлүүлэн суралцаж болно.</p>
<p>Сургууль математик, англи хэлний сургалтаараа онцлогтой бөгөөд цөм хөтөлбөрийн сурагчид олимпиад, IELTS/SAT, судалгаа, клубын үйл ажиллагаанд илүү цаг зарцуулах боломжтой.</p>
<h2>Төгсөгчдийн гадаадын их, дээд сургуульд элссэн байдал (2022–2026)</h2>
<ul>
<li>2022: 34 төгсөгчөөс 9 нь гадаадад элссэн (26.5%)</li>
<li>2023: 22 төгсөгчөөс 8 (36.4%)</li>
<li>2024: 42 төгсөгчөөс 13 (31.0%)</li>
<li>2025: 26 төгсөгчөөс 11 (42.3%)</li>
<li>2026: 29 төгсөгчөөс 16 (55.2%)</li>
<li><strong>Нийт: 153 төгсөгчөөс 57 нь гадаадад элссэн (37.3%)</strong></li>
</ul>
<p>Гадаадад элссэн хувь 2022 оны 26.5%-иас 2026 онд 55.2% болж тогтвортой өссөн нь онцлох эерэг үзүүлэлт юм.</p>
<h2>Тэтгэлэг</h2>
<p>2022–2026 онд цөм хөтөлбөрийн төгсөгчид нийт <strong>$3.36 сая</strong> тэтгэлэг хүртсэн. Жил бүрийн дүнг доорх графикаас харна уу.</p>
"""

PROGRAMS = [
    {"slug": "ib-diploma-programme", "name": "IBDP хөтөлбөр", "badge": "IBDP", "grade_from": 11, "grade_to": 12,
     "summary": "Олон улсын бакалаврын (IB Diploma) хөтөлбөр — Монголд анх удаа 2018 оноос, 11–12-р анги.", "body_html": IB_BODY,
     # (он, төгсөгчдийн тоо, нийт тэтгэлэг USD) — тайлангийн 1, 2-р хүснэгт
     "scholarships": [(2022, 14, 75_100), (2023, 16, 1_393_528), (2024, 25, 1_182_900), (2025, 51, 8_407_651), (2026, 63, 13_380_208)]},
    {"slug": "cambridge-international", "name": "Cambridge хөтөлбөр", "badge": "Cambridge", "grade_from": 6, "grade_to": 10,
     "summary": "Cambridge Lower Secondary (6–8-р анги, Checkpoint) ба Cambridge IGCSE (9–10-р анги) — 2021 оноос.", "body_html": CAMBRIDGE_BODY,
     "scholarships": []},
    {"slug": "national-core-curriculum", "name": "Үндэсний цөм хөтөлбөр", "badge": "Үндэсний", "grade_from": 1, "grade_to": 12,
     "summary": "Монгол Улсын ерөнхий боловсролын цөм хөтөлбөр — 1–12-р анги, ЭЕШ-д бэлтгэнэ.", "body_html": NATIONAL_BODY,
     "scholarships": [(2022, 34, 322_000), (2023, 22, 586_000), (2024, 42, 69_000), (2025, 26, 1_518_689), (2026, 29, 866_867)]},
]
SAMPLE_NAMES = {"Дорж", "Сараа", "Бат"}

# ⚠ ЖИШЭЭ — ЭЕШ-ийн оноо баримтад байхгүй; --radar-sample өгвөл Үндэсний цөм хөтөлбөрт радар график хоосон үед л тавина.
RADAR_SAMPLE = {
    "title": "ЭЕШ-ийн дундаж оноо (жишээ)",
    "subjects": ["Математик", "Монгол хэл", "Англи хэл", "Физик", "Хими", "Биологи", "Нийгэм", "Түүх"],
    "series": [
        {"name": "2024", "values": [612, 588, 634, 571, 559, 566, 602, 590]},
        {"name": "2025", "values": [641, 603, 655, 590, 574, 581, 615, 598]},
        {"name": "2026", "values": [668, 621, 683, 612, 596, 604, 631, 617]},
    ],
}

# ------------------------------------------------------------------ Төгсөлтийн тоо (2022–2026: цөм 153 + IB 169)
STATS = {"total_graduates": 322, "abroad_count": 180, "university_percent": 0, "university_count": 0}   # их, дээд сургуульд элссэн хувь/тоо баримтад байхгүй → 0 (карт нуугдана), админаас оруулна

# ------------------------------------------------------------------ 2026 оны элсэлт: улс → сургуулиуд (School Profile, College Acceptances 2026)
COUNTRIES: list[tuple[str, list[str]]] = [
    ("US", [
        "Pacific Lutheran University", "Trinity College", "University of Connecticut", "Syracuse University", "Michigan State University",
        "University of Minnesota, Twin Cities", "DePaul University", "Temple University", "University of Richmond", "University of South Dakota",
        "Indiana University Southeast", "University of Kansas", "Mississippi State University", "University of Denver", "University of Minnesota Duluth",
        "Albion College", "Coe College", "Long Island University", "Penn State University", "University of Utah Asia Campus", "Roosevelt University",
        "Loyola University Chicago", "Loyola Marymount University", "Pace University", "Beloit College", "Rochester Institute of Technology",
        "Franklin & Marshall College", "Georgia State University", "Mount Holyoke College", "Agnes Scott College", "University of Mississippi",
        "Augustana University", "Northeastern University", "University of California, Merced", "University of California, Riverside",
        "University of California, Santa Cruz", "University of California, Irvine", "University of California, Davis", "Drexel University",
        "San Diego State University", "California State Polytechnic University, Pomona", "Florida Institute of Technology", "Adelphi University",
        "University of Illinois Chicago", "Cleveland State University", "Spring Arbor University", "Barry University", "California Lutheran University",
        "Saint Mary's College of California", "Illinois Institute of Technology", "California State University, East Bay", "University of San Francisco",
        "Stony Brook University", "DePauw University", "Harper Community College", "University at Buffalo", "University of Kentucky", "Miami University",
        "La Sierra University", "Hofstra University", "Clarkson University", "Embry-Riddle Aeronautical University", "Case Western Reserve University",
        "Seattle University", "University of Pittsburgh", "University of Dayton", "University of Illinois Urbana-Champaign",
    ]),
    ("CA", [
        "University of British Columbia", "McGill University", "University of Toronto", "University of Calgary", "Lakehead University", "Western University",
        "University of Waterloo", "McMaster University", "Mount Allison University", "University of Manitoba", "Wilfrid Laurier University", "Brock University",
        "University of Windsor", "Toronto Metropolitan University", "University of Guelph", "University of Prince Edward Island",
    ]),
    ("GB", ["Birkbeck, University of London", "University of Manchester", "University of York"]),
    ("KR", ["SUNY Korea", "Konkuk University", "Chonju University", "Korea University", "Hanyang University", "Sungkyunkwan University"]),
    ("HK", ["Hong Kong University of Science and Technology", "Hong Kong Baptist University", "City University of Hong Kong", "University of Hong Kong"]),
    ("CN", [
        "NYU Shanghai", "Duke Kunshan University", "Wuhan University", "Central University of Finance and Economics", "Xi'an Jiaotong-Liverpool University",
        "Xi'an Jiaotong University", "Shanghai University of Finance and Economics", "Shanghai University", "Donghua University", "Beijing Foreign Studies University",
    ]),
    ("SG", ["National University of Singapore", "Nanyang Technological University"]),
    ("NL", ["University of Amsterdam", "Wageningen University"]),
    ("AU", ["Macquarie University"]),
    ("BE", ["Artevelde University of Applied Sciences"]),
    ("FR", ["École Ducasse"]),
    ("JP", ["Temple University, Japan Campus"]),
    ("TW", ["Asia University"]),
]


async def seed_programs(db) -> None:
    order = (await db.execute(select(func.max(Program.order)))).scalar() or 0
    for spec in PROGRAMS:
        p = (await db.execute(select(Program).where(Program.slug == spec["slug"]))).scalar_one_or_none()
        fields = {k: spec[k] for k in ("name", "badge", "summary", "grade_from", "grade_to", "body_html")}
        if p is None:
            order += 1
            p = Program(slug=spec["slug"], order=order, is_published=True, **fields)
            db.add(p)
            print(f"Хөтөлбөр үүсгэв: {spec['name']}")
        else:
            for k, v in fields.items():
                setattr(p, k, v.strip() if isinstance(v, str) else v)
            print(f"Хөтөлбөр шинэчлэв: {spec['name']}")
    await db.flush()


async def seed_scholarships(db, drop_sample: bool) -> None:
    for spec in PROGRAMS:
        p = (await db.execute(select(Program).where(Program.slug == spec["slug"]))).scalar_one()
        if drop_sample:
            await db.execute(delete(Scholarship).where(Scholarship.program_id == p.id, Scholarship.student_name.in_(SAMPLE_NAMES)))
        existing = set((await db.execute(select(Scholarship.student_name).where(Scholarship.program_id == p.id))).scalars())
        for i, (year, count, amount) in enumerate(spec["scholarships"]):
            name = f"{year} оны төгсөгчид ({count})"
            if name in existing:
                continue
            db.add(Scholarship(program_id=p.id, student_name=name, university="Гадаад, дотоодын их, дээд сургуулиуд — нийт", year=year, amount_usd=amount, order=i))
        print(f"Тэтгэлэг: {spec['slug']} — {len(spec['scholarships'])} жил")
    await db.flush()


async def seed_radar_sample(db) -> None:
    p = (await db.execute(select(Program).where(Program.slug == "national-core-curriculum"))).scalar_one_or_none()
    if p is None:
        return
    if p.radar:
        print("Радар: аль хэдийн байна — алгаслаа.")
        return
    p.radar = RADAR_SAMPLE
    print("Радар: жишээ ЭЕШ оноо тавьлаа (Үндэсний цөм).")


async def seed_graduates(db, reset_countries: bool) -> None:
    st = await get_stats(db)
    for k, v in STATS.items():
        setattr(st, k, v)
    print(f"Төгсөлтийн тоо: нийт {STATS['total_graduates']}, гадаадад {STATS['abroad_count']}")
    if reset_countries:
        await db.execute(delete(GraduateCountry))
        await db.flush()
    existing = set((await db.execute(select(GraduateCountry.code))).scalars())
    order = (await db.execute(select(func.max(GraduateCountry.order)))).scalar() or 0
    added = 0
    for code, unis in COUNTRIES:
        if code in existing:
            continue
        order += 1
        db.add(GraduateCountry(code=code, universities=unis, order=order))
        added += 1
    print(f"Улс: {added} нэмэгдсэн (байсан: {len(existing)})")


async def main(a: argparse.Namespace) -> None:
    async with SessionLocal() as db:
        if not a.no_programs:
            await seed_programs(db)
        await seed_scholarships(db, a.drop_sample)
        if a.radar_sample:
            await seed_radar_sample(db)
        await seed_graduates(db, a.reset_countries)
        await db.commit()
        print("Дууслаа.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--drop-sample", action="store_true", help="жишээ нэртэй тэтгэлгийн мөрүүдийг устгах")
    ap.add_argument("--reset-countries", action="store_true", help="улсуудыг бүгдийг устгаж дахин үүсгэх")
    ap.add_argument("--no-programs", action="store_true", help="хөтөлбөрийн текстэд хүрэхгүй")
    ap.add_argument("--radar-sample", action="store_true", help="Үндэсний цөмд ЭЕШ радар графикийн ЖИШЭЭ оноо (хоосон үед л)")
    asyncio.run(main(ap.parse_args()))
