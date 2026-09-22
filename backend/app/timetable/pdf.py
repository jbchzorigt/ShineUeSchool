"""Ангийн хуваарийг PDF болгоно (ReportLab, А4 хэвтээ, DejaVu Sans — кирилл)."""

from datetime import date
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from ..config import BASE_DIR
from .models import WEEKDAY_NAMES, ClassGroup, Lesson, Period

FONTS_DIR = BASE_DIR / "fonts"
NAVY = colors.HexColor("#1e3a8f")
LINE = colors.HexColor("#c9d2ea")
BREAK_BG = colors.HexColor("#e6ebf6")
_fonts_ready = False


def _ensure_fonts() -> None:
    global _fonts_ready
    if _fonts_ready:
        return
    pdfmetrics.registerFont(TTFont("DejaVu", str(FONTS_DIR / "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont("DejaVu-Bold", str(FONTS_DIR / "DejaVuSans-Bold.ttf")))
    pdfmetrics.registerFontFamily("DejaVu", normal="DejaVu", bold="DejaVu-Bold", italic="DejaVu", boldItalic="DejaVu-Bold")
    _fonts_ready = True


def build_class_pdf(cg: ClassGroup, periods: list[Period], lessons: list[Lesson]) -> bytes:
    """Нэг анги нэг хуудас: мөр = цаг (цагийн зайтай), багана = өдөр, завсарлага саарал мөр."""
    _ensure_fonts()
    year = cg.year
    days = list(range(1, year.working_days + 1))
    by_slot = {(l.weekday, l.period_id): l for l in lessons}

    h1 = ParagraphStyle("h1", fontName="DejaVu-Bold", fontSize=15, leading=19, textColor=NAVY)
    h2 = ParagraphStyle("h2", fontName="DejaVu", fontSize=11, leading=14)
    small = ParagraphStyle("small", fontName="DejaVu", fontSize=8, leading=10, textColor=colors.grey)
    cell = ParagraphStyle("cell", fontName="DejaVu", fontSize=8.5, leading=10.5)
    head = ParagraphStyle("head", fontName="DejaVu-Bold", fontSize=9, leading=11, textColor=colors.white)

    data = [[Paragraph("Цаг", head)] + [Paragraph(WEEKDAY_NAMES[d], head) for d in days]]
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    for i, p in enumerate(periods, start=1):
        span = f"{p.start_time:%H:%M}–{p.end_time:%H:%M}"
        if p.is_break:
            data.append([Paragraph(f"Завсарлага &nbsp; {span}", cell)] + [""] * len(days))
            style += [("SPAN", (0, i), (-1, i)), ("BACKGROUND", (0, i), (-1, i), BREAK_BG)]
            continue
        row = [Paragraph(f"<b>{p.order}</b><br/>{span}", cell)]
        for d in days:
            l = by_slot.get((d, p.id))
            if l is None:
                row.append("")
                continue
            text = f"<b>{escape(l.subject.name)}</b><br/>{escape(l.teacher.short_name)}"
            if l.room:
                text += f"<br/>{escape(l.room.name)}"
            row.append(Paragraph(text, cell))
        data.append(row)

    width = landscape(A4)[0] - 24 * mm
    table = Table(data, colWidths=[30 * mm] + [(width - 30 * mm) / len(days)] * len(days), repeatRows=1)
    table.setStyle(TableStyle(style))

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), leftMargin=12 * mm, rightMargin=12 * mm,
                            topMargin=12 * mm, bottomMargin=12 * mm, title=f"{cg.name} — хичээлийн хуваарь")
    doc.build([
        Paragraph("Шинэ Үе сургууль", h1),
        Paragraph(f"{escape(cg.name)} ангийн хичээлийн хуваарь — {escape(year.name)} хичээлийн жил", h2),
        Paragraph(f"Хэвлэсэн: {date.today():%Y-%m-%d}", small),
        Spacer(1, 6 * mm),
        table,
    ])
    return buf.getvalue()
