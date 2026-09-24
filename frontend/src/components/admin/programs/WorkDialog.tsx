"use client";

/* Бүтээл нэмэх Modal: зураг (заавал, preview), гарчиг, сурагч, тайлбар → multipart нэг хүсэлт. */

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Field, Input, Modal, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { WorkInput } from "@/lib/types";

export function WorkDialog({ programId, open, onClose, onSaved }: { programId: number; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<WorkInput>({ title: "", student: "", caption: "" });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URL файлаас гаралтай, cleanup-д чөлөөлнө
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!file) { setErrors({ image: "Зураг оруулна уу." }); return; }
    setBusy(true); setErrors({});
    try { await api.programs.works.create(programId, { title: d.title.trim(), student: d.student.trim(), caption: d.caption.trim() }, file); onSaved(); onClose(); }
    catch (err) { const fe = err instanceof ApiError ? err.fieldErrors : {}; setErrors(Object.keys(fe).length ? fe : { non_field_errors: "Хадгалж чадсангүй." }); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} title="Бүтээл нэмэх" onClose={onClose}
           footer={<><Button variant="ghost" type="button" onClick={onClose}>Болих</Button><Button type="submit" form="work-form" disabled={busy}>{busy ? "Хадгалж байна…" : "Хадгалах"}</Button></>}>
      <form id="work-form" onSubmit={save} className="space-y-4">
        {errors.non_field_errors && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.non_field_errors}</p>}
        <div className="flex items-start gap-4">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            {preview ? <Image src={preview} alt="" fill unoptimized sizes="112px" className="object-cover" /> : <span className="grid h-full place-items-center text-xs text-slate-500">Зураг</span>}
          </div>
          <div className="space-y-2">
            <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Бүтээлийн зураг сонгох" onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
                   className="block text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-navy/90" />
            {errors.image && <p className="text-xs font-medium text-red-600">{errors.image}</p>}
            <p className="text-xs text-slate-500">JPEG/PNG/WebP, 10 MB хүртэл (заавал).</p>
          </div>
        </div>
        <Field label="Гарчиг" error={errors.title}><Input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} maxLength={160} autoFocus /></Field>
        <Field label="Сурагч" error={errors.student} hint="Нэр, анги (ж: Б.Ану, 11а)"><Input value={d.student} onChange={(e) => setD({ ...d, student: e.target.value })} maxLength={120} /></Field>
        <Field label="Тайлбар" error={errors.caption}><Textarea value={d.caption} onChange={(e) => setD({ ...d, caption: e.target.value })} maxLength={280} className="min-h-20" /></Field>
      </form>
    </Modal>
  );
}
