"use client";

/* Нүүрний «Төгсөлт» тоонууд: нийт төгсөгч, их дээд сургуульд элссэн хувь (0–100) ба тоо, гадаадын их сургуульд элссэн тоо.
   Нэг мөрт тохиргоо (GET/PATCH /api/graduates/admin/stats/); хадгалахад талбар бүрийн алдаа доор нь. */

import { useState, type FormEvent } from "react";
import { Button, Card, Field, Input, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { GraduateStats } from "@/lib/types";

const FIELDS: { key: keyof GraduateStats; label: string; hint?: string; max?: number }[] = [
  { key: "total_graduates", label: "Нийт төгсөгч" },
  { key: "university_percent", label: "Их, дээд сургуульд элссэн хувь", hint: "0–100", max: 100 },
  { key: "university_count", label: "Их, дээд сургуульд элссэн тоо" },
  { key: "abroad_count", label: "Гадаадын их сургуульд элссэн тоо" },
];

export function StatsForm() {
  const q = useFetch(() => api.graduates.stats.get(), []);
  const [d, setD] = useState<GraduateStats | null>(null);
  if (q.data && d === null) setD(q.data);   // анх ачаалахад л формд оруулна (засварыг reload дарахгүй)
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!d) return;
    setBusy(true); setErrors({}); setSaved(false);
    try {
      setD(await api.graduates.stats.update(d));
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setErrors(err.fieldErrors);
      else setErrors({ _: err instanceof ApiError ? err.message : "Хадгалж чадсангүй." });
    } finally { setBusy(false); }
  }

  if (q.error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>;
  if (!d) return <Spinner />;
  return (
    <Card>
      <form onSubmit={save} className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-navy">Үзүүлэлт</h2>
          <p className="text-sm text-slate-600">Нүүрний «Төгсөлт» хэсгийн тоонууд (counter-ээр гарна).</p>
        </div>
        {errors._ && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors._}</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FIELDS.map((f) => (
            <Field key={f.key} label={f.label} hint={f.hint} error={errors[f.key]}>
              <Input type="number" min={0} max={f.max} value={d[f.key]} onChange={(e) => setD({ ...d, [f.key]: Number(e.target.value) })} required />
            </Field>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy}>{busy ? "Хадгалж байна…" : "Хадгалах"}</Button>
          {saved && <span className="text-sm text-green-700">Хадгалагдлаа.</span>}
        </div>
      </form>
    </Card>
  );
}
