"""
Олимпиадын өгөгдлийн загварууд.

- Stage      : нэг жилийн олимпиадын нэг шат (бүртгэл, I шат, ... , шагнал)
- Result     : нэг жил, нэг ангиллын нэг оролцогчийн үр дүн (Excel-ийн нэг мөр)
- AlbumPhoto : Маам багшийн албумын зураг + тайлбар
"""

from django.db import models


class Stage(models.Model):
    """Олимпиадын шат. Хуваарийн хуудсанд оноор бүлэглэн харуулна."""

    year = models.PositiveIntegerField("Олимпиадын он", db_index=True)
    order = models.PositiveSmallIntegerField("Дараалал", default=1)
    title = models.CharField("Шатны нэр", max_length=120)
    date_text = models.CharField(
        "Огноо (текстээр)", max_length=60,
        help_text="Жишээ: 2026 · 10 сарын 1–20. Хуудсан дээр яг ингэж харагдана.",
    )
    date = models.DateField("Огноо", null=True, blank=True, help_text="Эрэмбэлэх, тооцоолоход ашиглана.")
    text = models.TextField("Тайлбар", blank=True)
    tags = models.JSONField(
        "Тагууд", default=list, blank=True,
        help_text='Жишээ: ["90 минут", "5 бодлого"]',
    )
    location = models.CharField("Байршил", max_length=120, blank=True)

    class Meta:
        ordering = ["year", "order"]
        verbose_name = "Олимпиадын шат"
        verbose_name_plural = "Олимпиадын шатууд"
        unique_together = [("year", "order")]

    def __str__(self):
        return f"{self.year} · {self.order}. {self.title}"


class Category(models.TextChoices):
    """Оролцогчийн ангилал. Excel-ийн sheet бүр нэг ангилал."""

    G6 = "6", "VI анги"
    G7 = "7", "VII анги"
    G8 = "8", "VIII анги"
    G9 = "9", "IX анги"
    G10 = "10", "X анги"
    G11 = "11", "XI анги"
    G12 = "12", "XII анги"
    TEACHER_PRIMARY = "teacher_primary", "Бага ангийн багш"
    TEACHER_SECONDARY = "teacher_secondary", "Дунд ангийн багш"


class Result(models.Model):
    """Нэг оролцогчийн үр дүн. Байрыг оноогоор нь API талд тооцно."""

    RANK_LABELS = [("", "—"), ("I", "I байр"), ("II", "II байр"), ("III", "III байр")]
    MEDALS = [("", "—"), ("АЛТ", "Алт"), ("МӨНГӨ", "Мөнгө"), ("ХҮРЭЛ", "Хүрэл")]

    year = models.PositiveIntegerField("Олимпиадын он", db_index=True)
    category = models.CharField("Ангилал", max_length=20, choices=Category.choices, db_index=True)
    last_name = models.CharField("Овог", max_length=80, blank=True)
    first_name = models.CharField("Нэр", max_length=80)
    school = models.CharField("Сургууль", max_length=160, blank=True)
    code = models.CharField("Шифр", max_length=30, blank=True, help_text="Багш нарын ангилалд ашиглагдана.")
    scores = models.JSONField("Бодлого бүрийн оноо", default=list, blank=True, help_text="Жишээ: [7, 7, 0, 7, 5]")
    score = models.DecimalField("Нийт оноо", max_digits=6, decimal_places=2, null=True, blank=True)
    rank_label = models.CharField("Байр (I/II/III)", max_length=4, blank=True, choices=RANK_LABELS)
    medal = models.CharField("Медаль", max_length=10, blank=True, choices=MEDALS)
    rank = models.PositiveSmallIntegerField(
        "Байр (тоогоор)", null=True, blank=True,
        help_text="Хоосон бол оноогоор автоматаар тооцно.",
    )
    note = models.CharField("Тэмдэглэл", max_length=200, blank=True)

    class Meta:
        ordering = ["year", "category", models.F("score").desc(nulls_last=True), "last_name", "first_name"]
        verbose_name = "Үр дүн"
        verbose_name_plural = "Үр дүн"

    @property
    def student(self) -> str:
        """Харуулах нэр: Овгийн эхний үсэг + нэр (жишээ: Б.Мухулай)."""
        if self.last_name and self.last_name != "*":
            return f"{self.last_name[0]}.{self.first_name}"
        return self.first_name

    @property
    def full_name(self) -> str:
        return f"{self.last_name} {self.first_name}".strip()

    def __str__(self):
        return f"{self.year} · {self.get_category_display()} · {self.full_name} ({self.score})"


class AlbumPhoto(models.Model):
    """Маам багшийн дурсамжийн албумын нэг зураг."""

    image = models.ImageField("Зураг", upload_to="album/")
    caption = models.TextField("Тайлбар өгүүлбэр", help_text="Слайд солигдоход харагдах өгүүлбэр.")
    order = models.PositiveSmallIntegerField("Дараалал", default=1)
    is_published = models.BooleanField("Нийтлэх", default=True)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "Албумын зураг"
        verbose_name_plural = "Албумын зургууд"

    def __str__(self):
        return f"{self.order}. {self.caption[:40]}"
