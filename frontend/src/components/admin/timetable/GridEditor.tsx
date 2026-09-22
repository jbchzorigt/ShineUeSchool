"use client";

/* Өдөр × цаг хүснэгт. Нүд дээр дарахад (эсвэл Tab-аар очоод Enter) popover нээгдэнэ; өөрчлөлт client дээр
   хадгалагдаж "Хадгалах" дарахад PUT classes/{id}/grid/ (бүхэлд нь солино). Backend давхардал буцаавал
   тухайн нүднүүд улаан хүрээтэй, title-д тайлбартай. Хадгалаагүй үед хуудас хаахад анхааруулна. */

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { ClassGroup, Conflict, CurriculumEntry, GridCell, Lesson, PeriodSet, Room, Subject, Teacher } from "@/lib/types";
import { Badge, Button } from "@/components/ui";
import { WEEKDAY_NAMES, hm } from "@/components/timetable/format";
import { CellPopover, type CellSelection } from "./CellPopover";
import { CurriculumPanel } from "./CurriculumPanel";

const keyOf = (weekday: number, periodId: number) => `${weekday}-${periodId}`;

interface Props {
  classGroup: ClassGroup; periodSet: PeriodSet; workingDays: number;
  subjects: Subject[]; teachers: Teacher[]; rooms: Room[]; curriculum: CurriculumEntry[];
  initialLessons: Lesson[]; onDirtyChange: (dirty: boolean) => void;
}

export function GridEditor({ classGroup, periodSet, workingDays, subjects, teachers, rooms, curriculum, initialLessons, onDirtyChange }: Props) {
  // Харагдахгүй (өөр цагийн хүснэгт / завсарлага болсон / ажлын өдрөөс гадуур) хичээлийг хадгалахгүй
  const lessonPeriodIds = new Set(periodSet.periods.filter((p) => !p.is_break).map((p) => p.id));
  const isVisible = (l: Lesson) => lessonPeriodIds.has(l.period.id) && l.weekday <= workingDays;
  const skippedCount = initialLessons.filter((l) => !isVisible(l)).length;
  const [cells, setCells] = useState<Record<string, GridCell>>(() => Object.fromEntries(
    initialLessons.filter(isVisible).map((l) => [keyOf(l.weekday, l.period.id),
      { weekday: l.weekday, period_id: l.period.id, subject_id: l.subject.id, teacher_id: l.teacher.id, room_id: l.room?.id ?? null }])));
  const [dirty, setDirty] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [orphansNoticeVisible, setOrphansNoticeVisible] = useState(skippedCount > 0);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [dirty]);

  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const teacherById = new Map(teachers.map((t) => [t.id, t]));
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const days = Array.from({ length: workingDays }, (_, i) => i + 1);
  const lessonPeriods = periodSet.periods.filter((p) => !p.is_break);
  const bottomPeriodIds = new Set(lessonPeriods.slice(-2).map((p) => p.id));
  const conflictsAt = (k: string) => conflicts.filter((c) => keyOf(c.weekday, c.period_id) === k);
  const conflictText = (c: Conflict) => `${c.kind === "teacher" ? "Багш" : "Өрөө"} ${c.who} — ${c.with_class} ангитай давхцаж байна`;

  function change(weekday: number, periodId: number, sel: CellSelection | null) {
    const k = keyOf(weekday, periodId);
    setCells((prev) => {
      const next = { ...prev };
      if (sel) next[k] = { weekday, period_id: periodId, ...sel };
      else delete next[k];
      return next;
    });
    const remaining = conflicts.filter((c) => keyOf(c.weekday, c.period_id) !== k);
    setConflicts(remaining);
    if (remaining.length === 0) setError("");
    setDirty(true); onDirtyChange(true);
    setOpen(null);
  }

  async function save() {
    setBusy(true); setError(""); setConflicts([]);
    try {
      await api.timetable.grid.save(classGroup.id, Object.values(cells));
      setDirty(false); onDirtyChange(false);
      setSavedAt(new Date().toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" }));
      setOrphansNoticeVisible(false);
    } catch (err) {
      if (err instanceof ApiError && err.data && typeof err.data === "object" && "conflicts" in err.data) {
        const list = (err.data as { conflicts: Conflict[] }).conflicts;
        setConflicts(list);
        setError(`${list.length} давхардал байна — улаан нүднүүдийг засаад дахин хадгална уу. Юу ч хадгалагдаагүй.`);
      } else {
        setError(err instanceof ApiError ? Object.values(err.fieldErrors).join(" ") || err.message : "Хадгалж чадсангүй.");
      }
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-black text-navy">{classGroup.name} анги</h2>
        <span className="text-sm text-slate-500">{periodSet.name}</span>
        {dirty && <Badge tone="gold">Хадгалаагүй өөрчлөлт</Badge>}
        {!dirty && savedAt && <span className="text-sm text-emerald-700">Хадгалсан {savedAt}</span>}
        <Button className="ml-auto" onClick={save} disabled={!dirty || busy}>{busy ? "Хадгалж байна…" : "Хадгалах"}</Button>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {orphansNoticeVisible && skippedCount > 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {skippedCount} хичээл энэ хүснэгтэд харагдахгүй тул хадгалахад хасагдана.
        </p>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="min-w-0 flex-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <div className={open ? "pb-72" : ""}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-24 border-b border-r border-slate-200 bg-slate-50 p-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Цаг</th>
                  {days.map((d) => <th key={d} className="border-b border-slate-200 bg-slate-50 p-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{WEEKDAY_NAMES[d]}</th>)}
                </tr>
              </thead>
              <tbody>
                {periodSet.periods.map((p) => p.is_break ? (
                  <tr key={p.id} className="bg-slate-100">
                    <td colSpan={days.length + 1} className="border-b border-slate-200 px-2 py-1 text-xs text-slate-500">Завсарлага {hm(p.start_time)}–{hm(p.end_time)}</td>
                  </tr>
                ) : (
                  <tr key={p.id}>
                    <td className="border-b border-r border-slate-200 p-2 align-top">
                      <div className="font-bold text-navy">{p.order}</div>
                      <div className="text-xs text-slate-500">{hm(p.start_time)}–{hm(p.end_time)}</div>
                    </td>
                    {days.map((d) => {
                      const k = keyOf(d, p.id);
                      const c = cells[k];
                      const cf = conflictsAt(k);
                      const subject = c ? subjectById.get(c.subject_id) : undefined;
                      const ring = cf.length
                        ? "bg-red-50 ring-2 ring-inset ring-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
                        : "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy";
                      return (
                        <td key={d} className="relative border-b border-slate-200 p-0 align-top">
                          <button type="button" onClick={() => setOpen(open === k ? null : k)} title={cf.map(conflictText).join("\n")}
                                  aria-label={`${WEEKDAY_NAMES[d]}, ${p.order}-р цаг`}
                                  className={`block min-h-16 w-full px-2 py-1.5 text-left hover:bg-navy/5 ${ring}`}>
                            {c ? (
                              <>
                                <span className="block border-l-[3px] pl-1.5 font-semibold text-ink" style={{ borderColor: subject?.color ?? "#1e3a8f" }}>{subject?.name ?? "?"}</span>
                                <span className="block pl-[9px] text-xs text-slate-600">
                                  {teacherById.get(c.teacher_id)?.short_name ?? "?"}{c.room_id ? ` · ${roomById.get(c.room_id)?.name ?? "?"}` : ""}
                                </span>
                                {cf.length > 0 && <span className="block pl-[9px] text-xs font-semibold text-red-700">{cf.map(conflictText).join("; ")}</span>}
                              </>
                            ) : <span className="text-slate-300">+</span>}
                          </button>
                          {open === k && (
                            <CellPopover value={c ?? null} subjects={subjects} teachers={teachers} rooms={rooms}
                                         align={d === days[days.length - 1] ? "right" : "left"}
                                         placement={bottomPeriodIds.has(p.id) ? "above" : "below"}
                                         onChange={(sel) => change(d, p.id, sel)} onClose={() => setOpen(null)} />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <CurriculumPanel curriculum={curriculum} cells={cells} subjects={subjects} />
      </div>
    </div>
  );
}
