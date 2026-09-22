"use client";

/* Хуваарийг Excel-ээс оруулах: 1. Шалгах (dry run) → тайлан, 2. Импортлох. Алдаатай sheet байвал юу ч бичигдэхгүй. */

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { TimetableImportResponse } from "@/lib/types";
import { Badge, Button, Card, Field } from "@/components/ui";
import { WEEKDAY_NAMES } from "@/components/timetable/format";
import { useYear } from "@/components/timetable/useYear";
import { YearSelect } from "@/components/timetable/YearSelect";

export default function TimetableImportPage() {
  const { years, yearId, setYearId } = useYear();
  const [file, setFile] = useState<File | null>(null);
  const [replace, setReplace] = useState(true);
  const [preview, setPreview] = useState<TimetableImportResponse | null>(null);
  const [done, setDone] = useState<TimetableImportResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"check" | "import" | null>(null);

  async function run(dryRun: boolean) {
    if (!file || !yearId) return;
    setBusy(dryRun ? "check" : "import"); setError("");
    try {
      const res = await api.timetable.lessons.importExcel(file, yearId, dryRun, replace);
      if (dryRun) { setPreview(res); setDone(null); }
      else { setDone(res); setPreview(null); }
    } catch (err) {
      const fe = err instanceof ApiError ? err.fieldErrors : {};
      setError(fe.file || fe.year || fe.detail || "Импорт амжилтгүй боллоо.");
    } finally { setBusy(null); }
  }

  const report = done ?? preview;
  const hasErrors = !!report && report.sheets.some((s) => s.warnings.length || s.conflicts.length);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy">Хуваарийг Excel-ээс оруулах</h1>
        <p className="text-sm text-slate-600">
          Sheet бүр нэг анги (нэр нь <code>9а</code>). Толгой мөр <b>Цаг | Даваа | Мягмар | Лхагва | Пүрэв | Баасан</b> (+ Бямба),
          эхний багана цагийн дугаар, нүдэнд <b>Математик / Б.Мухулай / 204</b> (өрөө сонголттой). Хичээлийг нэр эсвэл товч нэрээр, багшийг товч нэрээр таньна.
        </p>
      </div>

      <Card className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Хичээлийн жил">
            <YearSelect years={years} value={yearId}
                        onChange={(id) => { setYearId(id); setPreview(null); setDone(null); setError(""); }} className="w-full" />
          </Field>
          <Field label="Excel файл (.xlsx)">
            <input type="file" accept=".xlsx,.xlsm,.xls"
                   onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); setDone(null); setError(""); }}
                   className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-navy/90" />
          </Field>
        </div>
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input type="checkbox" checked={replace}
                 onChange={(e) => { setReplace(e.target.checked); setPreview(null); setDone(null); setError(""); }}
                 className="mt-0.5 h-4 w-4 accent-navy" />
          <span>Файлд байгаа ангиудын <b>хуучин хуваарийг бүхэлд нь солино</b><span className="block text-xs text-slate-500">Унтраавал файлын нүднүүд л солигдож, бусад нүд хэвээр үлдэнэ.</span></span>
        </label>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => run(true)} disabled={!file || !yearId || !!busy}>{busy === "check" ? "Шалгаж байна…" : "1. Шалгах"}</Button>
          <Button onClick={() => run(false)} disabled={!file || !preview || hasErrors || !!busy}>{busy === "import" ? "Импортлож байна…" : "2. Импортлох"}</Button>
        </div>
        {!preview && !done && <p className="text-xs text-slate-500">Эхлээд &quot;Шалгах&quot; дарж тайланг үзсэний дараа &quot;Импортлох&quot; идэвхжинэ (алдаагүй бол).</p>}
      </Card>

      {report && (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-bold text-navy">{done ? (done.imported ? "Импорт амжилттай" : "Импортлоогүй — алдаа байна") : "Шалгалтын тайлан"}</h2>
            <Badge tone="gold">Нийт {report.total} нүд</Badge>
            {done?.imported && <Badge tone="green">Бичсэн {done.created}, устгасан {done.deleted}</Badge>}
            {hasErrors && <Badge tone="slate">Алдаатай тул юу ч бичигдэхгүй</Badge>}
          </div>
          <div className="space-y-3">
            {report.sheets.map((s) => (
              <div key={s.sheet} className={`rounded-xl border p-3 ${s.warnings.length || s.conflicts.length ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold">{s.sheet}</span>
                  {s.class_name ? <Badge tone="navy">{s.class_name}</Badge> : <Badge tone="slate">анги олдсонгүй</Badge>}
                  <span className="text-slate-600">{s.count} нүд</span>
                </div>
                {s.warnings.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-red-700">{s.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
                {s.conflicts.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-sm text-red-700">
                    {s.conflicts.map((c, i) => <li key={i}>{WEEKDAY_NAMES[c.weekday]}, {c.period_order}-р цаг: {c.kind === "teacher" ? "багш" : "өрөө"} {c.who} — {c.with_class} ангитай давхцаж байна</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
