"""Excel экспортын нийтлэг хамгаалалт."""

# Эдгээр тэмдэгтээр эхэлсэн текстийг Excel томъёо гэж ойлгодог
FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def keep_as_text(ws) -> None:
    """Нийтийн маягтаас ирсэн утга томъёо болж ажиллахаас хамгаална: текстээр хадгалж (openpyxl "=..."-г томъёо болгодог),
    quotePrefix-ээр Excel дээр нүдийг засахад ч текст хэвээр үлдээнэ. Толгой мөрөөс бусдад мөрүүдийг нэмсний дараа дуудна."""
    for row in ws.iter_rows(min_row=2):
        for c in row:
            if isinstance(c.value, str) and c.value.startswith(FORMULA_PREFIXES):
                c.data_type = "s"
                c.quotePrefix = True
