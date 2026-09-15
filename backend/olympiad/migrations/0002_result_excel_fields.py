"""
Result загварыг бодит Excel файлын бүтцэд тааруулна:
grade (int) → category (str), student → last_name + first_name,
шинээр code, scores, rank_label, medal; score null болж болно.
"""

from django.db import migrations, models


def forwards(apps, schema_editor):
    Result = apps.get_model("olympiad", "Result")
    for r in Result.objects.all():
        r.category = str(r.grade)
        parts = (r.student or "").split(" ", 1)
        if len(parts) == 2:
            r.last_name, r.first_name = parts[0], parts[1]
        else:
            r.last_name, r.first_name = "", parts[0]
        r.save(update_fields=["category", "last_name", "first_name"])


def backwards(apps, schema_editor):
    Result = apps.get_model("olympiad", "Result")
    for r in Result.objects.all():
        r.grade = int(r.category) if r.category.isdigit() else 6
        r.student = f"{r.last_name} {r.first_name}".strip()
        r.save(update_fields=["grade", "student"])


class Migration(migrations.Migration):

    dependencies = [
        ("olympiad", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="result",
            name="category",
            field=models.CharField(
                choices=[("6", "VI анги"), ("7", "VII анги"), ("8", "VIII анги"), ("9", "IX анги"), ("10", "X анги"),
                         ("11", "XI анги"), ("12", "XII анги"), ("teacher_primary", "Бага ангийн багш"),
                         ("teacher_secondary", "Дунд ангийн багш")],
                db_index=True, default="6", max_length=20, verbose_name="Ангилал",
            ),
            preserve_default=False,
        ),
        migrations.AddField(model_name="result", name="last_name", field=models.CharField(blank=True, max_length=80, verbose_name="Овог")),
        migrations.AddField(model_name="result", name="first_name", field=models.CharField(default="", max_length=80, verbose_name="Нэр"), preserve_default=False),
        migrations.AddField(model_name="result", name="code", field=models.CharField(blank=True, help_text="Багш нарын ангилалд ашиглагдана.", max_length=30, verbose_name="Шифр")),
        migrations.AddField(model_name="result", name="scores", field=models.JSONField(blank=True, default=list, help_text="Жишээ: [7, 7, 0, 7, 5]", verbose_name="Бодлого бүрийн оноо")),
        migrations.AddField(model_name="result", name="rank_label", field=models.CharField(blank=True, choices=[("", "—"), ("I", "I байр"), ("II", "II байр"), ("III", "III байр")], max_length=4, verbose_name="Байр (I/II/III)")),
        migrations.AddField(model_name="result", name="medal", field=models.CharField(blank=True, choices=[("", "—"), ("АЛТ", "Алт"), ("МӨНГӨ", "Мөнгө"), ("ХҮРЭЛ", "Хүрэл")], max_length=10, verbose_name="Медаль")),
        migrations.AlterField(model_name="result", name="score", field=models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True, verbose_name="Нийт оноо")),
        migrations.AlterField(model_name="result", name="school", field=models.CharField(blank=True, max_length=160, verbose_name="Сургууль")),
        migrations.AlterField(model_name="result", name="rank", field=models.PositiveSmallIntegerField(blank=True, help_text="Хоосон бол оноогоор автоматаар тооцно.", null=True, verbose_name="Байр (тоогоор)")),
        migrations.RunPython(forwards, backwards),
        migrations.RemoveField(model_name="result", name="grade"),
        migrations.RemoveField(model_name="result", name="student"),
        migrations.AlterModelOptions(
            name="result",
            options={
                "ordering": ["year", "category", models.OrderBy(models.F("score"), descending=True, nulls_last=True), "last_name", "first_name"],
                "verbose_name": "Үр дүн", "verbose_name_plural": "Үр дүн",
            },
        ),
    ]
