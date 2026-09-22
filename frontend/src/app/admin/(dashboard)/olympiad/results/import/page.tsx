"use client";

/* Excel-ээс олимпиадын үр дүн импортлох.
   1. Файл сонгоно (sheet бүр нэг ангилал: suragch_VI ... bagsh_dund)
   2. "Шалгах" — баазад бичихгүй, sheet бүрийн тоо, анхааруулгыг харуулна
   3. "Импортлох" — тухайн он + ангиллын хуучин мөрүүдийг сольж бичнэ */

import Link from "next/link";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { ImportResponse } from "@/lib/types";
import { Badge, Button, Card, Field, Input, Table, Td, Th } from "@/components/ui";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState<string>("");
  const [replace, setReplace] = useState(true);
  const [preview, setPreview] = useState<ImportResponse | null>(null);
  const [done, setDone] = useState<ImportResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"check" | "import" | null>(null);

  async function run(dryRun: boolean) {
    if (!file) return;
    setBusy(dryRun ? "check" : "import"); setError("");
    try {
      const res = await api.results.importExcel(file, year === "" ? "" : Number(year), dryRun, replace);
      if (dryRun) { setPreview(res); setDone(null); }
      else { setDone(res); setPreview(null); }
    } catch (err) {
      const fe = err instanceof ApiError ? err.fieldErrors : {};
      setError(fe.file || fe.year || fe.detail || "Импорт амжилтгүй боллоо.");
    } finally {
      setBusy(null);
    }
  }

  const report = done ?? preview;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy">Excel-ээс үр дүн оруулах</h1>
        <p className="text-sm text-slate-600">
          Олимпиадын дүнгийн Excel файлыг сонгоно. Sheet бүр нэг ангилал (<code>suragch_VI</code> … <code>suragch_XII</code>, <code>bagsh_baga</code>, <code>bagsh_dund</code>),
          толгой мөр нь <b>№ | Овог | Нэр | Сургууль | [Шифр] | 1 | 2 | … | Нийт оноо | Байр | Медаль</b> байх ёстой.
        </p>
      </div>

      <Card className="space-y-4">
        <Field label="Excel файл (.xlsx)">
          <input type="file" accept=".xlsx,.xlsm,.xls"
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); setDone(null); setError(""); }}
            className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-navy/90" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Олимпиадын он" hint="Хоосон бол файл дахь огнооноос авна">
            <Input type="number" placeholder={String(new Date().getFullYear())} value={year} onChange={(e) => setYear(e.target.value)} />
          </Field>
          <label className="flex items-start gap-3 pt-6 text-sm text-slate-700">
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="mt-0.5 h-4 w-4 accent-navy" />
            <span>Тухайн он, ангиллын <b>хуучин мөрүүдийг устгаж</b> шинээр бичих <span className="block text-xs text-slate-500">Унтраавал одоо байгаа мөрүүд дээр нэмнэ (давхардаж болзошгүй).</span></span>
          </label>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => run(true)} disabled={!file || !!busy}>{busy === "check" ? "Шалгаж байна…" : "1. Шалгах"}</Button>
          <Button onClick={() => run(false)} disabled={!file || !preview || !!busy}>{busy === "import" ? "Импортлож байна…" : "2. Импортлох"}</Button>
          <Link href="/admin/olympiad/results" className="ml-auto self-center text-sm font-semibold text-navy hover:underline">Үр дүн рүү →</Link>
        </div>
        {!preview && !done && <p className="text-xs text-slate-500">Эхлээд «Шалгах» дарж тайланг үзсэний дараа «Импортлох» идэвхжинэ.</p>}
      </Card>

      {report && (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-bold text-navy">{done ? "Импорт амжилттай" : "Шалгалтын тайлан"}</h2>
            <Badge tone="navy">{report.year} он</Badge>
            {report.detected_date && <Badge tone="slate">Файлын огноо: {report.detected_date}</Badge>}
            <Badge tone="gold">Нийт {report.total} мөр</Badge>
            {done && <Badge tone="green">Нэмсэн {done.created} · устгасан {done.deleted}</Badge>}
          </div>
          <Table head={<><Th>Sheet</Th><Th>Ангилал</Th><Th className="text-right">Бодлого</Th><Th className="text-right">Мөр</Th><Th className="text-right">Алгассан</Th><Th>Анхааруулга</Th></>}>
            {report.sheets.map((s) => (
              <tr key={s.sheet} className={s.category ? "" : "bg-red-50"}>
                <Td className="font-mono text-xs">{s.sheet}</Td>
                <Td className="font-semibold">{s.category_label}</Td>
                <Td className="text-right tabular-nums">{s.problems}</Td>
                <Td className="text-right font-bold tabular-nums text-navy">{s.count}</Td>
                <Td className="text-right tabular-nums text-slate-500">{s.skipped}</Td>
                <Td>
                  {s.warnings.length === 0 ? <span className="text-xs text-emerald-700">—</span> : (
                    <ul className="space-y-0.5 text-xs text-amber-700">{s.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
          {done && <Link href="/admin/olympiad/results"><Button variant="secondary">Үр дүнг харах →</Button></Link>}
        </Card>
      )}
    </div>
  );
}
