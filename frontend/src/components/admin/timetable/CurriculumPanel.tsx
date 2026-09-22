"use client";

/* Хөтөлбөрийн шалгалт (client дээр шууд тооцно): хичээл бүр хуваарьт орсон / төлөвлөсөн цаг.
   Тэнцүү ногоон, дутуу шар, илүү (эсвэл хөтөлбөрт байхгүй) улаан. */

import Link from "next/link";
import type { CurriculumEntry, GridCell, Subject } from "@/lib/types";

export function CurriculumPanel({ curriculum, cells, subjects }: { curriculum: CurriculumEntry[]; cells: Record<string, GridCell>; subjects: Subject[] }) {
  const counts = new Map<number, number>();
  for (const c of Object.values(cells)) counts.set(c.subject_id, (counts.get(c.subject_id) ?? 0) + 1);
  const planned = new Map(curriculum.map((e) => [e.subject_id, e.hours_per_week]));
  const rows = [...new Set([...planned.keys(), ...counts.keys()])]
    .map((id) => ({ id, name: subjects.find((s) => s.id === id)?.name ?? "?", planned: planned.get(id) ?? 0, scheduled: counts.get(id) ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const tone = (r: { planned: number; scheduled: number }) =>
    r.scheduled === r.planned ? "text-emerald-700" : r.scheduled < r.planned ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700";
  const total = rows.reduce((a, r) => ({ planned: a.planned + r.planned, scheduled: a.scheduled + r.scheduled }), { planned: 0, scheduled: 0 });

  return (
    <aside className="w-full shrink-0 rounded-2xl border border-slate-200 bg-white p-4 lg:w-64">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Хөтөлбөрийн шалгалт</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">Хөтөлбөр оруулаагүй. <Link href="/admin/timetable/curriculum" className="font-semibold text-navy hover:underline">Оруулах →</Link></p>
      ) : (
        <ul className="space-y-1 text-sm">
          {rows.map((r) => (
            <li key={r.id} className={`flex justify-between rounded px-2 py-1 ${tone(r)}`}>
              <span>{r.name}</span><span className="tabular-nums font-semibold">{r.scheduled}/{r.planned}</span>
            </li>
          ))}
          <li className="flex justify-between border-t border-slate-200 px-2 pt-2 font-semibold text-slate-700"><span>Нийт</span><span className="tabular-nums">{total.scheduled}/{total.planned}</span></li>
        </ul>
      )}
    </aside>
  );
}
