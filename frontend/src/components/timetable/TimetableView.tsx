"use client";

/* /timetable: Анги / Багш / Өрөө таб + сонголт → хуваарийн хүснэгт, ангийн харагдацад "PDF татах". */

import { useState } from "react";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { TimetableGrid, type ViewMode } from "./TimetableGrid";
import { useYear } from "./useYear";
import { YearSelect } from "./YearSelect";

const MODES: { key: ViewMode; label: string }[] = [{ key: "class", label: "Анги" }, { key: "teacher", label: "Багш" }, { key: "room", label: "Өрөө" }];
const selectCls = "rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/30";

export function TimetableView() {
  const { years, year, yearId, setYearId, loading, error } = useYear();
  const [mode, setMode] = useState<ViewMode>("class");
  const [sel, setSel] = useState<Record<ViewMode, number | null>>({ class: null, teacher: null, room: null });
  const classesQ = useFetch(() => (yearId ? api.timetable.classes.list(yearId) : null), [yearId]);
  const setsQ = useFetch(() => (yearId ? api.timetable.periodSets.list(yearId) : null), [yearId]);
  const teachersQ = useFetch(() => api.timetable.teachers.list(true), []);
  const roomsQ = useFetch(() => api.timetable.rooms.list(), []);

  const options = mode === "class" ? classesQ.data?.map((c) => ({ id: c.id, label: c.name })) : mode === "teacher" ? teachersQ.data?.map((t) => ({ id: t.id, label: t.short_name })) : roomsQ.data?.map((r) => ({ id: r.id, label: r.name }));
  const id = (sel[mode] !== null && options?.some((o) => o.id === sel[mode]) ? sel[mode] : options?.[0]?.id) ?? null;
  const lessonsQ = useFetch(() => (yearId && id ? api.timetable.lessons.list({ year: yearId, [mode]: id } as { year: number; class?: number; teacher?: number; room?: number }) : null), [yearId, mode, id]);
  const cls = mode === "class" ? classesQ.data?.find((c) => c.id === id) : undefined;
  const periods = cls ? setsQ.data?.find((s) => s.id === cls.period_set_id)?.periods : undefined;
  const listError = classesQ.error || teachersQ.error || roomsQ.error || setsQ.error;

  if (loading) return <p className="text-muted">Ачаалж байна…</p>;
  if (error || !year) return <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">Хуваарь одоогоор бэлэн болоогүй байна.</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Харагдац" className="flex rounded-lg border border-line bg-white p-1">
          {MODES.map((m) => (
            <button key={m.key} role="tab" aria-selected={mode === m.key} onClick={() => setMode(m.key)}
                    className={`rounded-md px-4 py-1.5 text-sm font-semibold ${mode === m.key ? "bg-navy text-white" : "text-ink hover:bg-navy/10"}`}>{m.label}</button>
          ))}
        </div>
        <select value={id ?? ""} onChange={(e) => setSel({ ...sel, [mode]: Number(e.target.value) })} className={selectCls} aria-label={MODES.find((m) => m.key === mode)?.label}>
          {options?.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        {years.length > 1 && <YearSelect years={years} value={yearId} onChange={setYearId} />}
        {cls && (
          <a href={api.timetable.classes.pdfUrl(cls.id)} target="_blank" rel="noopener"
             className="ml-auto inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep">
            PDF татах
          </a>
        )}
      </div>
      {listError ? (
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">{listError}</p>
      ) : options && options.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">Хуваарь оруулаагүй байна.</p>
      ) : lessonsQ.error ? (
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">{lessonsQ.error}</p>
      ) : lessonsQ.loading || !lessonsQ.data ? (
        <p className="text-muted">Ачаалж байна…</p>
      ) : (
        <TimetableGrid lessons={lessonsQ.data} periods={periods} workingDays={year.working_days} mode={mode} />
      )}
    </div>
  );
}
