"use client";

/* Тэтгэлэг нэмэх Modal: нэр, их сургууль, он (анхдагч энэ он), дүн USD, зураг (сонголттой) → JSON create, дараа зурагтай бол setPhoto. */

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Field, Input, Modal } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { Scholarship, ScholarshipInput } from "@/lib/types";

export function ScholarshipDialog({ programId, open, onClose, onSaved }: { programId: number; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<ScholarshipInput>({ student_name: "", university: "", year: new Date().getFullYear(), amount_usd: 0 });
  // create() амжилттай болсны дараа тухайн бичлэгийг энд хадгална: ингэснээр setPhoto амжилтгүй болсон ч
  // дахин "Хадгалах" дарахад ДАВХАР бичлэг үүсгэхгүй, харин зөвхөн setPhoto-г л дахин оролдоно.
  const [created, setCreated] = useState<Scholarship | null>(null);
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
    e.preventDefault(); setBusy(true); setErrors({});
    try {
      let rec = created;
      if (!rec) {
        rec = await api.programs.scholarships.create(programId, { ...d, student_name: d.student_name.trim(), university: d.university.trim() });
        setCreated(rec);
      }
      if (file) {
        try {
          await api.programs.scholarships.setPhoto(rec.id, file);
        } catch (err) {
          // Тэтгэлэг аль хэдийн хадгалагдсан тул жагсаалтыг сэргээнэ; Modal-ыг нээлттэй үлдээж,
          // file-ыг цэвэрлэхгүйгээр дахин оролдох боломж үлдээнэ (дараагийн "Хадгалах" нь create биш зөвхөн setPhoto дуудна).
          onSaved();
          const m = err instanceof ApiError ? err.fieldErrors.photo : undefined;
          setErrors({ photo: m ? `Тэтгэлэг хадгалагдсан, гэвч зураг: ${m}` : "Тэтгэлэг хадгалагдсан, гэвч зураг орж чадсангүй. Дахин оролдоно уу." });
          return;
        }
      }
      onSaved(); onClose();
    } catch (err) { const fe = err instanceof ApiError ? err.fieldErrors : {}; setErrors(Object.keys(fe).length ? fe : { non_field_errors: "Хадгалж чадсангүй." }); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} title={created ? "Зураг нэмэх" : "Тэтгэлэг нэмэх"} onClose={onClose}
           footer={<><Button variant="ghost" type="button" onClick={onClose}>Болих</Button><Button type="submit" form="sch-form" disabled={busy}>{busy ? "Хадгалж байна…" : "Хадгалах"}</Button></>}>
      <form id="sch-form" onSubmit={save} className="space-y-4">
        {errors.non_field_errors && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.non_field_errors}</p>}
        <Field label="Сурагчийн нэр" error={errors.student_name}><Input value={d.student_name} onChange={(e) => setD({ ...d, student_name: e.target.value })} maxLength={120} autoFocus disabled={!!created} /></Field>
        <Field label="Их сургууль / байгууллага" error={errors.university}><Input value={d.university} onChange={(e) => setD({ ...d, university: e.target.value })} maxLength={160} disabled={!!created} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Төгссөн он" error={errors.year}><Input type="number" min={2000} max={2100} value={d.year} onChange={(e) => setD({ ...d, year: Number(e.target.value) })} disabled={!!created} /></Field>
          <Field label="Тэтгэлгийн дүн (USD)" error={errors.amount_usd}><Input type="number" min={0} step={1} value={d.amount_usd} onChange={(e) => setD({ ...d, amount_usd: Number(e.target.value) })} disabled={!!created} /></Field>
        </div>
        <div className="flex items-start gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
            {preview ? <Image src={preview} alt="" fill unoptimized sizes="80px" className="object-cover" /> : <span className="grid h-full place-items-center text-xs text-slate-500">Зураг</span>}
          </div>
          <div className="space-y-2">
            <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Сурагчийн зураг сонгох" onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
                   className="block text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-navy/90" />
            {errors.photo && <p className="text-xs font-medium text-red-600">{errors.photo}</p>}
            <p className="text-xs text-slate-500">Сонголттой. JPEG/PNG/WebP, 10 MB хүртэл.</p>
          </div>
        </div>
      </form>
    </Modal>
  );
}
