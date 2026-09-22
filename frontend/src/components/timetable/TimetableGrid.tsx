/* Унших хуваарийн хүснэгт (олон нийт). Мөр = цаг, багана = өдөр. Ангийн харагдацад periods өгөгдөнө (завсарлага саарал мөр);
   багш/өрөөний харагдацад мөрүүд хичээлүүдийн (эхлэх, дуусах) цагаас үүснэ. Нүдний 2-р мөр mode-оос хамаарна:
   class → багш · өрөө, teacher → анги · өрөө, room → анги · багш. Утсан дээр (md-ээс доош) өдөр бүр босоо блок. */

import type { Lesson, Period } from "@/lib/types";
import { WEEKDAY_NAMES, hm } from "./format";

export type ViewMode = "class" | "teacher" | "room";

interface Row { key: string; label: string; start: string; end: string; isBreak: boolean; periodIds: Set<number> }

export function buildRows(lessons: Lesson[], periods?: Period[]): Row[] {
  if (periods) {
    return periods.map((p) => ({ key: String(p.id), label: p.is_break ? "Завсарлага" : String(p.order), start: p.start_time, end: p.end_time, isBreak: p.is_break, periodIds: new Set([p.id]) }));
  }
  const map = new Map<string, Row>();
  for (const l of lessons) {
    const k = `${l.period.start_time}-${l.period.end_time}`;
    const r = map.get(k) ?? { key: k, label: "", start: l.period.start_time, end: l.period.end_time, isBreak: false, periodIds: new Set<number>() };
    r.periodIds.add(l.period.id);
    map.set(k, r);
  }
  return [...map.values()].sort((a, b) => a.start.localeCompare(b.start));
}

function secondLine(l: Lesson, mode: ViewMode): string {
  const parts = mode === "class" ? [l.teacher.short_name, l.room?.name] : mode === "teacher" ? [l.class_group.name, l.room?.name] : [l.class_group.name, l.teacher.short_name];
  return parts.filter(Boolean).join(" · ");
}

function LessonCell({ l, mode }: { l: Lesson; mode: ViewMode }) {
  return (
    <div className="border-l-[3px] pl-2" style={{ borderColor: l.subject.color }}>
      <div className="font-semibold text-ink">{l.subject.name}</div>
      <div className="text-[13px] text-muted">{secondLine(l, mode)}</div>
    </div>
  );
}

export function TimetableGrid({ lessons, periods, workingDays, mode }: { lessons: Lesson[]; periods?: Period[]; workingDays: number; mode: ViewMode }) {
  const rows = buildRows(lessons, periods);
  const days = Array.from({ length: workingDays }, (_, i) => i + 1);
  const at = (d: number, r: Row) => lessons.filter((l) => l.weekday === d && r.periodIds.has(l.period.id));

  if (lessons.length === 0) return <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">Хуваарь оруулаагүй байна.</p>;

  return (
    <>
      {/* Ширээний хүснэгт */}
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-paper-2">
              <th scope="col" className="w-28 border-b border-r border-line px-3 py-2 text-left font-display text-base font-extrabold text-navy">Цаг</th>
              {days.map((d) => <th key={d} scope="col" className="border-b border-line px-3 py-2 text-left font-display text-base font-extrabold text-navy">{WEEKDAY_NAMES[d]}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => r.isBreak ? (
              <tr key={r.key} className="bg-paper-3">
                <td colSpan={days.length + 1} className="border-b border-line px-3 py-1 text-xs text-muted">Завсарлага {hm(r.start)}–{hm(r.end)}</td>
              </tr>
            ) : (
              <tr key={r.key}>
                <th scope="row" className="border-b border-r border-line px-3 py-2 text-left align-top">
                  {r.label && <div className="font-bold text-navy">{r.label}</div>}
                  <div className="text-xs font-normal text-muted tabular-nums">{hm(r.start)}–{hm(r.end)}</div>
                </th>
                {days.map((d) => (
                  <td key={d} className="border-b border-line px-3 py-2 align-top">
                    <div className="space-y-2">{at(d, r).map((l) => <LessonCell key={l.id} l={l} mode={mode} />)}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Утас: өдөр бүр босоо блок */}
      <div className="space-y-6 md:hidden">
        {days.map((d) => {
          const items = rows.filter((r) => !r.isBreak).flatMap((r) => at(d, r).map((l) => ({ r, l })));
          return (
            <section key={d} aria-label={WEEKDAY_NAMES[d]}>
              <h3 className="mb-2 font-display text-lg font-extrabold text-navy">{WEEKDAY_NAMES[d]}</h3>
              {items.length === 0 ? <p className="text-sm text-muted">Хичээлгүй</p> : (
                <ul className="divide-y divide-line rounded-xl border border-line bg-white">
                  {items.map(({ r, l }) => (
                    <li key={l.id} className="flex gap-3 px-3 py-2">
                      <span className="w-24 shrink-0 text-xs text-muted tabular-nums">{hm(r.start)}–{hm(r.end)}</span>
                      <LessonCell l={l} mode={mode} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
