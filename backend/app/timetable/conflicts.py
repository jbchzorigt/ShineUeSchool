"""
Багш, өрөөний давхардал. Period-ийн дугаараар биш ЦАГААР шалгана: нэг weekday дотор хоёр хичээлийн
[start, end) зай огтлолцож байвал (a) ижил багш → "teacher", (b) ижил өрөө → "room".
Цагийн хүснэгтүүд өөр минуттай (бага анги 35, ахлах 40) тул дугаар таарахгүй ч цаг давхцаж болно.
"""

from dataclasses import dataclass
from datetime import time


@dataclass(frozen=True)
class Slot:
    class_group_id: int
    class_name: str
    weekday: int
    period_id: int
    period_order: int
    start: time
    end: time
    teacher_id: int
    teacher_name: str
    room_id: int | None
    room_name: str


def overlaps(a: Slot, b: Slot) -> bool:
    return a.weekday == b.weekday and a.start < b.end and b.start < a.end


def find_conflicts(candidates: list[Slot], existing: list[Slot]) -> list[dict]:
    """
    candidates — хадгалах гэж буй нүднүүд (нэг анги), existing — тухайн жилийн бусад ангийн хичээлүүд.
    Candidate бүрийг existing + бусад candidate-тай харьцуулна. Нэг нүд, нэг төрөл, нэг эсрэг талд нэг л бичлэг.
    """
    out: list[dict] = []
    seen: set[tuple] = set()
    others = existing + candidates
    for c in candidates:
        for o in others:
            if o is c or not overlaps(c, o):
                continue
            if o.teacher_id == c.teacher_id:
                key = (c.weekday, c.period_id, "teacher", o.class_group_id, o.period_id)
                if key not in seen:
                    seen.add(key)
                    out.append({"weekday": c.weekday, "period_id": c.period_id, "period_order": c.period_order,
                                "kind": "teacher", "with_class": o.class_name, "who": o.teacher_name})
            if c.room_id is not None and o.room_id == c.room_id:
                key = (c.weekday, c.period_id, "room", o.class_group_id, o.period_id)
                if key not in seen:
                    seen.add(key)
                    out.append({"weekday": c.weekday, "period_id": c.period_id, "period_order": c.period_order,
                                "kind": "room", "with_class": o.class_name, "who": o.room_name})
    return out
