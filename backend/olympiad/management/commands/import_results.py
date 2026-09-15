"""
Олимпиадын дүнгийн Excel файлыг командын мөрөөс импортлоно.

    uv run manage.py import_results "C:/path/Олимпиадын дүн.xlsx" --year 2026
    uv run manage.py import_results file.xlsx --dry-run        # зөвхөн шалгана
    uv run manage.py import_results file.xlsx --no-replace     # хуучин мөрийг устгахгүй нэмнэ
"""

from django.core.management.base import BaseCommand, CommandError

from olympiad.importer import import_workbook, parse_workbook


class Command(BaseCommand):
    help = "Excel файлаас олимпиадын үр дүн импортлоно."

    def add_arguments(self, parser):
        parser.add_argument("path", help="Excel (.xlsx) файлын зам")
        parser.add_argument("--year", type=int, help="Олимпиадын он (өгөхгүй бол файл дахь огнооноос)")
        parser.add_argument("--dry-run", action="store_true", help="Баазад бичихгүй, зөвхөн шалгана")
        parser.add_argument("--no-replace", action="store_true", help="Тухайн он+ангиллын хуучин мөрүүдийг устгахгүй")

    def handle(self, *args, **o):
        try:
            parsed = parse_workbook(o["path"], o.get("year"))
        except Exception as e:  # noqa: BLE001
            raise CommandError(f"Файлыг уншиж чадсангүй: {e}") from e

        year = o.get("year") or (parsed.detected_date.year if parsed.detected_date else None)
        if not year:
            raise CommandError("Оныг тодорхойлж чадсангүй. --year өгнө үү.")

        self.stdout.write(f"Он: {year}   (файл дахь огноо: {parsed.detected_date})")
        for s in parsed.sheets:
            self.stdout.write(f"  {s.sheet:<14} {s.category_label:<20} {len(s.rows):>4} мөр, {s.problems} бодлого, {s.skipped} алгассан")
            for w in s.warnings[:5]:
                self.stdout.write(self.style.WARNING(f"      ! {w}"))
        self.stdout.write(f"Нийт: {parsed.total} мөр")

        if o["dry_run"]:
            self.stdout.write(self.style.NOTICE("dry-run: баазад бичсэнгүй."))
            return
        r = import_workbook(parsed, year, replace=not o["no_replace"])
        self.stdout.write(self.style.SUCCESS(f"Устгасан {r['deleted']}, нэмсэн {r['created']} мөр."))
