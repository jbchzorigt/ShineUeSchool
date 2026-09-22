"use client";

/* Академик календарь: жилийн сар бүр mini-календарь. Өдрийн нүд үйл явдлын өнгөөр (үйл явдалд өнгө өгөөгүй бол
   ангиллын анхдагч: улирал хөх, амралт ногоон, шалгалт улаан, үйл явдал шар, бусад саарал) цайвар будагдана;
   давхцвал: шалгалт > амралт > үйл явдал > бусад > улирал. Дээр "Одоо: 1-р улирал, 5-р долоо хоног".
   Огноог "YYYY-MM-DD" текстээр харьцуулна (timezone-оос хамаарахгүй). */

import { useState } from "react";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { AppliesTo, CalendarEvent, EventCategory } from "@/lib/types";
import { APPLIES_TO, EVENT_CATEGORIES, EVENT_COLORS, eventColor } from "./format";
import { useYear } from "./useYear";
import { YearSelect } from "./YearSelect";

const MONTHS = ["1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар", "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар"];
const DOW = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];
const PRIORITY: EventCategory[] = ["exam", "holiday", "event", "other", "term"];
/** Өдрийн нүдний цайвар дэвсгэр: "#rrggbb" + 33 (20% тунгалаг) */
const tint = (hex: string) => `${hex}33`;
const selectCls = "rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/30";

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const todayIso = () => { const t = new Date(); return iso(t.getFullYear(), t.getMonth() + 1, t.getDate()); };
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

function monthsBetween(start: string, end: string): { y: number; m: number }[] {
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  const out: { y: number; m: number }[] = [];
  for (let y = sy, m = sm; y < ey || (y === ey && m <= em); m === 12 ? (y++, m = 1) : m++) out.push({ y, m });
  return out;
}

function Month({ y, m, events, today }: { y: number; m: number; events: CalendarEvent[]; today: string }) {
  const first = iso(y, m, 1), last = iso(y, m, new Date(y, m, 0).getDate());
  const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Даваа = 0
  const n = new Date(y, m, 0).getDate();
  const inMonth = events.filter((e) => e.start_date <= last && e.end_date >= first);
  const on = (d: string) => inMonth.filter((e) => e.start_date <= d && d <= e.end_date);
  return (
    <section className="rounded-xl border border-line bg-white p-4" aria-label={`${y} оны ${MONTHS[m - 1]}`}>
      <h3 className="mb-2 font-display text-lg font-extrabold text-navy">{MONTHS[m - 1]} <span className="text-sm font-normal text-muted">{y}</span></h3>
      <div className="grid grid-cols-7 gap-px text-center text-xs">
        {DOW.map((d) => <div key={d} className="py-1 font-semibold text-muted">{d}</div>)}
        {Array.from({ length: offset }, (_, i) => <div key={`o${i}`} />)}
        {Array.from({ length: n }, (_, i) => {
          const d = iso(y, m, i + 1);
          const evs = on(d);
          const topCat = PRIORITY.find((c) => evs.some((e) => e.category === c));
          const top = topCat ? evs.find((e) => e.category === topCat) : undefined;
          return (
            <div key={d} title={evs.map((e) => e.title).join(", ")} style={top ? { background: tint(eventColor(top)) } : undefined}
                 className={`rounded py-1 tabular-nums ${d === today ? "font-extrabold ring-2 ring-navy" : ""}`}>{i + 1}</div>
          );
        })}
      </div>
      {inMonth.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {inMonth.map((e) => (
            <li key={e.id} className="flex items-start gap-2">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: eventColor(e) }} aria-hidden="true" />
              <span><span className="text-muted tabular-nums">{e.start_date === e.end_date ? e.start_date.slice(5) : `${e.start_date.slice(5)} – ${e.end_date.slice(5)}`}</span> {e.title}{e.applies_to !== "all" && <span className="text-muted"> · {APPLIES_TO[e.applies_to]}</span>}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CalendarView() {
  const { years, year, yearId, setYearId, loading, error } = useYear();
  const eventsQ = useFetch(() => (yearId ? api.timetable.calendar.list(yearId) : null), [yearId]);
  const [who, setWho] = useState<AppliesTo>("all");
  const today = todayIso();
  const events = (eventsQ.data ?? []).filter((e) => who === "all" || e.applies_to === "all" || e.applies_to === who);
  const term = events.find((e) => e.category === "term" && e.start_date <= today && today <= e.end_date);
  const week = term ? Math.floor(daysBetween(term.start_date, today) / 7) + 1 : null;

  if (loading) return <p className="text-muted">Ачаалж байна…</p>;
  if (error || !year) return <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">Календарь одоогоор бэлэн болоогүй байна.</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white">
          {term ? `Одоо: ${term.title}, ${week}-р долоо хоног` : `${year.name} хичээлийн жил`}
        </p>
        <select value={who} onChange={(e) => setWho(e.target.value as AppliesTo)} className={selectCls} aria-label="Хэнд хамаарах">
          {(Object.keys(APPLIES_TO) as AppliesTo[]).map((k) => <option key={k} value={k}>{APPLIES_TO[k]}</option>)}
        </select>
        {years.length > 1 && <YearSelect years={years} value={yearId} onChange={setYearId} />}
        <ul className="ml-auto flex flex-wrap gap-3 text-xs text-muted">
          {(Object.keys(EVENT_CATEGORIES) as EventCategory[]).map((k) => <li key={k} className="flex items-center gap-1"><span className="h-3 w-3 rounded" style={{ background: tint(EVENT_COLORS[k]) }} />{EVENT_CATEGORIES[k]}</li>)}
        </ul>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {monthsBetween(year.start_date, year.end_date).map(({ y, m }) => <Month key={`${y}-${m}`} y={y} m={m} events={events} today={today} />)}
      </div>
    </div>
  );
}
