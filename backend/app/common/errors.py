"""
Алдааны хариуг DRF-ийн хэлбэрт оруулна: frontend-ийн ApiError.fieldErrors үүнийг уншдаг.
  400 → {"талбар": ["мессеж"]} эсвэл {"non_field_errors": ["мессеж"]}
  404 → {"detail": "Олдсонгүй."}
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

MESSAGES = {
    "missing": "Энэ талбар заавал шаардлагатай.",
    "int_parsing": "Бүхэл тоо оруулна уу.",
    "float_parsing": "Тоо оруулна уу.",
    "string_type": "Текст оруулна уу.",
    "bool_parsing": "true эсвэл false байх ёстой.",
    "date_from_datetime_parsing": "Огноо буруу (YYYY-MM-DD).",
    "date_parsing": "Огноо буруу (YYYY-MM-DD).",
    "enum": "Зөвшөөрөгдөөгүй утга.",
    "literal_error": "Зөвшөөрөгдөөгүй утга.",
    "greater_than_equal": "Хэт бага утга.",
    "less_than_equal": "Хэт их утга.",
    "string_too_long": "Хэт урт.",
    "string_too_short": "Хэт богино.",
}


class FieldError(Exception):
    """Бизнес логикийн талбарын алдаа: raise FieldError("year", "Оныг тодорхойлж чадсангүй.")"""

    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message


class ConflictError(Exception):
    """Хуваарийн давхардал: 400 {"conflicts": [{weekday, period_id, period_order, kind, with_class, who}]}"""

    def __init__(self, conflicts: list[dict]):
        self.conflicts = conflicts


def register(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError):
        errors: dict[str, list[str]] = {}
        for e in exc.errors():
            loc = [str(x) for x in e.get("loc", []) if x not in ("body", "query", "path", "form")]
            field = loc[-1] if loc else "non_field_errors"
            if e.get("type") == "value_error":
                msg = str(e.get("ctx", {}).get("error", e.get("msg", "Буруу утга.")))
                if msg.startswith("Value error, "):
                    msg = msg[len("Value error, "):]
            else:
                msg = MESSAGES.get(e.get("type", ""), e.get("msg", "Буруу утга."))
            errors.setdefault(field, []).append(msg)
        return JSONResponse(errors, status_code=400)

    @app.exception_handler(FieldError)
    async def _field(request: Request, exc: FieldError):
        return JSONResponse({exc.field: [exc.message]}, status_code=400)

    @app.exception_handler(ConflictError)
    async def _conflict(request: Request, exc: ConflictError):
        return JSONResponse({"conflicts": exc.conflicts}, status_code=400)

    @app.exception_handler(StarletteHTTPException)
    async def _http(request: Request, exc: StarletteHTTPException):
        detail = exc.detail if exc.status_code != 404 or exc.detail != "Not Found" else "Олдсонгүй."
        return JSONResponse({"detail": detail}, status_code=exc.status_code, headers=exc.headers)
