"""Тестийн туслахууд: нэвтрэх, staff header."""


async def login(client, username, password="pass1234"):
    r = await client.post("/api/auth/token/", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return r.json()


async def staff_headers(client, make_user, username="staff", *, roles=("olympiad",), superuser=False):
    await make_user(username, roles=list(roles), superuser=superuser)
    t = await login(client, username)
    return {"Authorization": f"Bearer {t['access']}"}


class FakeFacebook:
    """Тестийн Facebook: токен → хэрэглэгч, page пост → id/алдаа."""

    def __init__(self):
        self.users: dict[str, dict] = {}   # access_token → {id, name, picture_url}
        self.posts: list[dict] = []
        self.fail_post: str | None = None  # None биш бол post_to_page алдаа шиднэ

    def add_user(self, token, fb_id, name, picture_url=""):
        self.users[token] = {"id": fb_id, "name": name, "picture_url": picture_url}

    async def debug_token(self, token):
        from app.social.facebook import FacebookError
        if token not in self.users:
            raise FacebookError("Токен хүчингүй.")
        return {"is_valid": True, "user_id": self.users[token]["id"]}

    async def me(self, token):
        return self.users[token]

    async def post_to_page(self, message, link):
        from app.social.facebook import FacebookError
        if self.fail_post:
            raise FacebookError(self.fail_post)
        self.posts.append({"message": message, "link": link})
        return f"{len(self.posts)}_100"


async def visitor_headers(client, fb, fb_id="1", name="Бат", token=None):
    token = token or f"tok-{fb_id}"
    fb.add_user(token, fb_id, name)
    r = await client.post("/api/social/facebook/login/", json={"access_token": token})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


async def manager_headers(client, make_user, username="manager1"):
    """Сургалтын менежерийн (manager эрх) Authorization header."""
    return await staff_headers(client, make_user, username, roles=("manager",))


async def seed_timetable(db):
    """
    Хуваарийн тестийн суурь өгөгдөл (flush хийнэ, commit хийхгүй):
      year 2026–2027 (одоогийн, 5 өдөр)
      primary  "Бага анги":         p1 order=1 08:00–08:35, p2 order=101 08:35–08:50 (завсарлага),
                                    p3 order=2 08:50–09:25 (мөрүүд start_time-аар эрэмблэгдэнэ)
      secondary "Дунд, ахлах анги": s1 order=1 08:00–08:40, s2 order=2 08:50–09:30
      classes: 1а (primary), 9а, 9б (secondary)
      subjects: Математик/Мат, Монгол хэл/Мон, Физик/Физ
      teachers: Б.Мухулай (Математик), Д.Сараа (Монгол хэл), Ц.Болд (Физик)
      rooms: 101, 204, 205
    Буцаана: SimpleNamespace(year, primary, secondary, p={("p",1): Period, ("s",2): ...},
                             classes={"9а": ClassGroup}, subjects={"Математик": Subject},
                             teachers={"Б.Мухулай": Teacher}, rooms={"204": Room})
    """
    from datetime import date, time
    from types import SimpleNamespace

    from app.timetable.models import AcademicYear, ClassGroup, Period, PeriodSet, Room, Subject, Teacher

    year = AcademicYear(name="2026–2027", start_date=date(2026, 9, 1), end_date=date(2027, 6, 10),
                        working_days=5, is_current=True)
    db.add(year)
    await db.flush()
    primary = PeriodSet(year_id=year.id, name="Бага анги")
    secondary = PeriodSet(year_id=year.id, name="Дунд, ахлах анги")
    db.add_all([primary, secondary])
    await db.flush()
    p = {
        ("p", 1): Period(period_set_id=primary.id, order=1, start_time=time(8, 0), end_time=time(8, 35)),
        ("p", 2): Period(period_set_id=primary.id, order=101, start_time=time(8, 35), end_time=time(8, 50), is_break=True),
        ("p", 3): Period(period_set_id=primary.id, order=2, start_time=time(8, 50), end_time=time(9, 25)),
        ("s", 1): Period(period_set_id=secondary.id, order=1, start_time=time(8, 0), end_time=time(8, 40)),
        ("s", 2): Period(period_set_id=secondary.id, order=2, start_time=time(8, 50), end_time=time(9, 30)),
    }
    subjects = {
        "Математик": Subject(name="Математик", short_name="Мат", color="#1e3a8f"),
        "Монгол хэл": Subject(name="Монгол хэл", short_name="Мон", color="#b91c1c"),
        "Физик": Subject(name="Физик", short_name="Физ", color="#047857"),
    }
    rooms = {n: Room(name=n) for n in ("101", "204", "205")}
    db.add_all([*p.values(), *subjects.values(), *rooms.values()])
    await db.flush()
    teachers = {
        "Б.Мухулай": Teacher(last_name="Батаа", first_name="Мухулай", short_name="Б.Мухулай", subjects=[subjects["Математик"]]),
        "Д.Сараа": Teacher(last_name="Дорж", first_name="Сараа", short_name="Д.Сараа", subjects=[subjects["Монгол хэл"]]),
        "Ц.Болд": Teacher(last_name="Цэнд", first_name="Болд", short_name="Ц.Болд", subjects=[subjects["Физик"]]),
    }
    classes = {
        "1а": ClassGroup(year_id=year.id, grade=1, letter="а", period_set_id=primary.id),
        "9а": ClassGroup(year_id=year.id, grade=9, letter="а", period_set_id=secondary.id),
        "9б": ClassGroup(year_id=year.id, grade=9, letter="б", period_set_id=secondary.id),
    }
    db.add_all([*teachers.values(), *classes.values()])
    await db.flush()
    # relationship-ууд (period_set.periods, class.year ...) ачаалагдсан байхын тулд
    for obj in (primary, secondary, *classes.values()):
        await db.refresh(obj)
    return SimpleNamespace(year=year, primary=primary, secondary=secondary, p=p, classes=classes,
                           subjects=subjects, teachers=teachers, rooms=rooms)


async def timetable_setup(client, make_user, db):
    """
    seed_timetable + manager_headers, дараа нь db.commit() + db.expunge_all(). Router-ийн IntegrityError дараа
    commit_or_400 нь db.rollback() дуудна; SQLAlchemy-ийн энэ rollback нь session-ийн identity map-д байгаа
    БҮХ объектыг expire хийдэг (зөвхөн тухайн хүсэлтийнхийг биш). expunge_all() нь seed объектуудыг (tt.year,
    tt.primary, ...) session-оос салгаж detached snapshot болгодог: аль хэдийн ачаалагдсан талбарууд нь
    (жишээ нь .id) цаашид IO шаардалгүйгээр уншигдана, мөн session.rollback() тэдгээрийг expire хийхгүй, учир
    нь тэд identity map-д байхгүй болсон. Тест дотор tt.* объектуудаас зөвхөн аль хэдийн ачаалагдсан scalar
    талбар (жишээ нь .id) уншина; db.add/db.delete/db.refresh-д ХЭЗЭЭ Ч дамжуулахгүй (detached тул алдаа өгнө).
    Буцаана: (tt, headers).
    """
    tt = await seed_timetable(db)
    h = await manager_headers(client, make_user)
    await db.commit()
    db.expunge_all()  # seed объектууд detached snapshot болно: .id уншигдана, rollback тэдгээрийг expire хийхгүй
    return tt, h


async def seed_clubs(db):
    """
    Дугуйлангийн тестийн суурь (flush хийнэ). Идэвхтэй ээлж "2026–2027 намар":
      chess  "Шатар"  квот {5:2, 6:1, 7:1, 8:1} (нийт 5), нээлттэй (start -1 өдөр, end +7 өдөр), үнэгүй
      robot  "Робот"  квот {9:1, 10:1} (нийт 2), нээлттэй, төлбөртэй 150000 "сард"
      song   "Дуу"    квот {1:5, 2:5, 3:5}, удахгүй (start +1 өдөр)
      draw   "Зураг"  квот {5:5}, хаагдсан (end -1 цаг)
      hidden "Нууц"   квот {5:5}, нээлттэй боловч нийтлэгдээгүй
    Буцаана: SimpleNamespace(round_id, chess_id, robot_id, song_id, draw_id, hidden_id) — зөвхөн int
    (handler rollback хийвэл ORM объект хуучирдаг тул).
    """
    from datetime import UTC, datetime, timedelta
    from types import SimpleNamespace

    from app.clubs.models import Club, ClubRound

    now = datetime.now(UTC)
    rnd = ClubRound(name="2026–2027 намар", is_active=True)
    db.add(rnd)
    await db.flush()

    def mk(name, quotas, *, start=-1, end=7, published=True, paid=False, fee=0, note="", order=0):
        # quotas: {анги: квот}; grades нь квотын түлхүүрүүдээс гарна (код л тавина)
        return Club(round_id=rnd.id, name=name, description=f"{name} дугуйлан",
                    quotas={str(g): n for g, n in quotas.items()}, grades=sorted(quotas),
                    is_paid=paid, fee=fee, fee_note=note, registration_start=now + timedelta(days=start),
                    registration_end=now + timedelta(days=end), is_published=published, order=order)

    chess = mk("Шатар", {5: 2, 6: 1, 7: 1, 8: 1}, order=1)
    robot = mk("Робот", {9: 1, 10: 1}, paid=True, fee=150000, note="сард", order=2)
    song = mk("Дуу", {1: 5, 2: 5, 3: 5}, start=1, order=3)
    draw = mk("Зураг", {5: 5}, end=-1 / 24, order=4)
    hidden = mk("Нууц", {5: 5}, published=False, order=5)
    db.add_all([chess, robot, song, draw, hidden])
    await db.flush()
    return SimpleNamespace(round_id=rnd.id, chess_id=chess.id, robot_id=robot.id, song_id=song.id,
                           draw_id=draw.id, hidden_id=hidden.id)


def get_code(sent_codes, email):
    """Тухайн хаягт хамгийн сүүлд илгээсэн код."""
    return next(c for e, c in reversed(sent_codes) if e == email)
