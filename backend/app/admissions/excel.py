"""Элсэгчдийн Excel: татах (бүх мэдээлэл + хоосон "Оноо", "Дүн" багана) ба дүн оруулах (зөвхөн Код, Оноо, Дүн уншина).

Менежер татсан файлдаа оноо, дүнг бөглөөд буцааж оруулна. Оноо, дүн хоёулаа хоосон мөрийг алгасна
(өмнө оруулсан дүнг устгахгүй — устгах бол админ хуудаснаас гараар).
"""

import io
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill

from .models import APP_WITHDRAWN, RESULT_LABELS, Applicant

HEADERS = ("Код", "Анги", "Овог", "Нэр", "Төрсөн огноо", "Хүйс", "Одоогийн сургууль",
           "Асран хамгаалагчийн овог", "Асран хамгаалагчийн нэр", "Утас", "Имэйл", "Бүртгүүлсэн", "Төлөв", "Оноо", "Дүн")
WIDTHS = (13, 6, 16, 16, 12, 7, 24, 18, 18, 14, 28, 17, 11, 8, 11)
GENDER = {"male": "Эр", "female": "Эм"}
# Импортод: монгол шошго эсвэл англи код
RESULT_INPUT = {**{v.lower(): k for k, v in RESULT_LABELS.items()}, **{k: k for k in RESULT_LABELS}}


def build_applicants_xlsx(applicants: list[Applicant]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Элсэгчид"
    ws.append(HEADERS)
    for c in ws[1]:
        c.font = Font(bold=True)
    fill = PatternFill("solid", fgColor="FFF4CC")   # бөглөх баганууд
    for c in ws[1][-2:]:
        c.fill = fill
    for a in sorted(applicants, key=lambda a: (a.grade, a.status == APP_WITHDRAWN, a.child_last_name, a.child_first_name)):
        ws.append((a.code, a.grade, a.child_last_name, a.child_first_name, a.birth_date.isoformat(),
                   GENDER.get(a.gender, a.gender), a.current_school, a.guardian_last_name, a.guardian_first_name,
                   a.phone, a.email, a.created_at.strftime("%Y-%m-%d %H:%M") if a.created_at else "",
                   "Татгалзсан" if a.status == APP_WITHDRAWN else "Бүртгэлтэй",
                   float(a.score) if a.score is not None else None, RESULT_LABELS.get(a.result or "", "")))
    for i, w in enumerate(WIDTHS):
        ws.column_dimensions[chr(ord("A") + i)].width = w
    ws.freeze_panes = "B2"
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


@dataclass
class ResultInput:
    row: int
    code: str
    score: Decimal | None
    result: str | None


def parse_results_xlsx(data: bytes) -> tuple[list[ResultInput], list[str], int]:
    """(мөрүүд, алдаанууд, хоосон алгассан мөрийн тоо). Эхний sheet-ийн "Код", "Оноо", "Дүн" баганыг толгойгоор олно."""
    try:
        wb = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    except Exception:
        return [], ["Excel (.xlsx) файл уншиж чадсангүй."], 0
    ws = wb.worksheets[0]
    rows = ws.iter_rows(values_only=True)
    header = [str(h).strip().lower() if h is not None else "" for h in next(rows, ())]
    col = {name: header.index(name) if name in header else None for name in ("код", "оноо", "дүн")}
    if col["код"] is None or (col["оноо"] is None and col["дүн"] is None):
        return [], ["Эхний мөрөнд «Код» болон «Оноо» эсвэл «Дүн» гэсэн багана байх ёстой."], 0

    out: list[ResultInput] = []
    errors: list[str] = []
    blank = 0
    for i, r in enumerate(rows, start=2):
        def cell(name):
            idx = col[name]
            return r[idx] if idx is not None and idx < len(r) else None

        code_v, score_v, result_v = cell("код"), cell("оноо"), cell("дүн")
        if code_v is None or str(code_v).strip() == "":
            if any(v not in (None, "") for v in r):
                errors.append(f"{i}-р мөр: код хоосон байна.")
            continue
        code = "".join(str(code_v).split()).upper()
        score = None
        if score_v not in (None, ""):
            try:
                score = Decimal(str(score_v).replace(",", ".")).quantize(Decimal("0.01"))
            except InvalidOperation:
                errors.append(f"{i}-р мөр ({code}): оноо тоо биш байна — «{score_v}».")
                continue
            if not (0 <= score <= 1000):
                errors.append(f"{i}-р мөр ({code}): оноо 0–1000 хооронд байх ёстой.")
                continue
        result = None
        if result_v not in (None, ""):
            result = RESULT_INPUT.get(str(result_v).strip().lower())
            if result is None:
                allowed = ", ".join(RESULT_LABELS.values())
                errors.append(f"{i}-р мөр ({code}): дүн «{result_v}» буруу. Зөвшөөрөгдөх: {allowed}.")
                continue
        if score is None and result is None:
            blank += 1
            continue
        out.append(ResultInput(row=i, code=code, score=score, result=result))
    return out, errors, blank
