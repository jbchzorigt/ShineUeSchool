"""
Олимпиадын өгөгдлийн загварууд.

- Stage      : нэг жилийн олимпиадын нэг шат (бүртгэл, I шат, ... , шагнал)
- Result     : нэг жил, нэг ангийн нэг сурагчийн үр дүн
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


class Result(models.Model):
    """Нэг сурагчийн үр дүн. Байрыг оноогоор нь API талд тооцно."""

    GRADE_CHOICES = [(g, f"{g}-р анги") for g in range(6, 13)]

    year = models.PositiveIntegerField("Олимпиадын он", db_index=True)
    grade = models.PositiveSmallIntegerField("Анги", choices=GRADE_CHOICES, db_index=True)
    student = models.CharField("Сурагчийн нэр", max_length=120)
    school = models.CharField("Сургууль", max_length=160)
    score = models.DecimalField("Оноо", max_digits=6, decimal_places=2)
    rank = models.PositiveSmallIntegerField(
        "Байр", null=True, blank=True,
        help_text="Хоосон бол оноогоор автоматаар тооцно.",
    )
    note = models.CharField("Тэмдэглэл", max_length=200, blank=True)

    class Meta:
        ordering = ["year", "grade", "-score", "student"]
        verbose_name = "Үр дүн"
        verbose_name_plural = "Үр дүн"

    def __str__(self):
        return f"{self.year} · {self.grade}-р анги · {self.student} ({self.score})"


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
