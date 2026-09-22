"use client";

/* Нүдний popover: хичээл → багш (тухайн хичээлийг заадаг нь эхэнд) → өрөө.
   Enter/OK хадгална, Esc хаана, "Хоослох" нүдийг цэвэрлэнэ. */

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { GridCell, Room, Subject, Teacher } from "@/lib/types";
import { Button, Field, Select } from "@/components/ui";

export type CellSelection = Pick<GridCell, "subject_id" | "teacher_id" | "room_id">;

interface Props {
  value: CellSelection | null; subjects: Subject[]; teachers: Teacher[]; rooms: Room[];
  align: "left" | "right"; placement?: "above" | "below"; onChange: (sel: CellSelection | null) => void; onClose: () => void;
}

export function CellPopover({ value, subjects, teachers, rooms, align, placement = "below", onChange, onClose }: Props) {
  const [subjectId, setSubjectId] = useState<number | "">(value?.subject_id ?? "");
  const [teacherId, setTeacherId] = useState<number | "">(value?.teacher_id ?? "");
  const [roomId, setRoomId] = useState<number | "">(value?.room_id ?? "");
  const first = useRef<HTMLSelectElement>(null);
  useEffect(() => { first.current?.focus(); }, []);

  const teaches = (t: Teacher) => subjectId !== "" && t.subject_ids.includes(subjectId);
  const sorted = [...teachers].sort((a, b) => Number(teaches(b)) - Number(teaches(a)) || a.short_name.localeCompare(b.short_name));
  const ok = subjectId !== "" && teacherId !== "";

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!ok) return;
    onChange({ subject_id: subjectId, teacher_id: teacherId, room_id: roomId === "" ? null : roomId });
  }

  return (
    <form onSubmit={submit} onKeyDown={(e) => e.key === "Escape" && onClose()}
          className={`absolute z-20 w-64 space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xl ${placement === "above" ? "bottom-full mb-1" : "top-full mt-1"} ${align === "right" ? "right-0" : "left-0"}`}>
      <Field label="Хичээл">
        <Select ref={first} value={subjectId} onChange={(e) => { setSubjectId(e.target.value ? Number(e.target.value) : ""); setTeacherId(""); }}>
          <option value="">— сонгох —</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </Field>
      <Field label="Багш">
        <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value ? Number(e.target.value) : "")} disabled={subjectId === ""}>
          <option value="">— сонгох —</option>
          {sorted.map((t) => <option key={t.id} value={t.id}>{t.short_name}{teaches(t) ? "" : " (өөр хичээл)"}</option>)}
        </Select>
      </Field>
      <Field label="Өрөө">
        <Select value={roomId} onChange={(e) => setRoomId(e.target.value ? Number(e.target.value) : "")}>
          <option value="">— байхгүй —</option>
          {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </Select>
      </Field>
      <div className="flex justify-between gap-2">
        {value ? <Button type="button" variant="danger" onClick={() => onChange(null)}>Хоослох</Button> : <span />}
        <div className="space-x-2">
          <Button type="button" variant="ghost" onClick={onClose}>Болих</Button>
          <Button type="submit" disabled={!ok}>OK</Button>
        </div>
      </div>
    </form>
  );
}
