"use client";

/* Дугуйлан үүсгэх/засах форм (Modal). Зургуудыг дугуйланг хадгалсны дараа дарааллаар upload хийнэ
   (backend-ийн зургийн endpoint дугуйлангийн id шаарддаг). */

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Field, Input, Modal, Textarea } from "@/components/ui";
import { GRADES } from "@/components/clubs/format";
import { api, ApiError } from "@/lib/api";
import type { ClubAdmin, ClubInput } from "@/lib/types";
import { fromLocalInput, toLocalInput } from "./datetime";

type Draft = Omit<ClubInput, "registration_start" | "registration_end" | "quotas" | "fee"> & { registration_start: string; registration_end: string; quotas: { grade: number; capacity: string }[]; fee: string };

function toDraft(c: ClubAdmin | null): Draft {
  if (!c) return { name: "", description: "", quotas: [], is_paid: false, fee: "", fee_note: "", registration_start: "", registration_end: "", is_published: true };
  return { name: c.name, description: c.description, quotas: c.quotas.map((q) => ({ grade: q.grade, capacity: String(q.capacity) })), is_paid: c.is_paid, fee: c.fee ? String(c.fee) : "",
           fee_note: c.fee_note, registration_start: toLocalInput(c.registration_start), registration_end: toLocalInput(c.registration_end), is_published: c.is_published };
}

export function ClubForm({ roundId, club, open, onClose, onSaved }: { roundId: number; club: ClubAdmin | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(() => toDraft(club));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  // Урьдчилан харах URL-ууд: файлууд өөрчлөгдөхөд шинээр үүсгэж, хуучныг чөлөөлнө
  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URL-ууд файлуудаас гаралтай, cleanup-д чөлөөлнө
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);
  const up = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErrors({});
    const body: ClubInput = {
      name: d.name.trim(), description: d.description, quotas: d.quotas.map((q) => ({ grade: q.grade, capacity: Number(q.capacity) })), is_paid: d.is_paid,
      fee: d.is_paid ? Number(d.fee || 0) : 0, fee_note: d.is_paid ? d.fee_note.trim() : "",
      registration_start: fromLocalInput(d.registration_start), registration_end: fromLocalInput(d.registration_end), is_published: d.is_published,
    };
    try {
      const saved = club ? await api.clubsAdmin.clubs.update(club.id, body) : await api.clubsAdmin.clubs.create(roundId, body);
      // Зургууд: дугуйлан хадгалагдсан тул алдаа гарсан ч формыг хаахгүй, мессеж үзүүлнэ
      let failed = 0;
      for (const f of files) {
        try { await api.clubsAdmin.images.add(saved.id, f); } catch { failed += 1; }
      }
      onSaved();
      if (failed) { setFiles([]); setErrors({ images: `Дугуйлан хадгалагдсан, гэвч ${failed} зураг орж чадсангүй. Дэлгэрэнгүй хуудаснаас дахин оруулна уу.` }); return; }
      onClose();
    } catch (err) {
      const fe = err instanceof ApiError ? err.fieldErrors : {};
      setErrors(Object.keys(fe).length ? fe : { non_field_errors: err instanceof ApiError ? err.message : "Хадгалж чадсангүй." });
    } finally { setBusy(false); }
  }

  const DEFAULT_QUOTA = "5";
  const has = (g: number) => d.quotas.some((q) => q.grade === g);
  const toggleGrade = (g: number) =>
    up("quotas", has(g) ? d.quotas.filter((q) => q.grade !== g) : [...d.quotas, { grade: g, capacity: DEFAULT_QUOTA }].sort((a, b) => a.grade - b.grade));
  const setQuota = (g: number, v: string) => up("quotas", d.quotas.map((q) => (q.grade === g ? { ...q, capacity: v } : q)));
  const allGrades = () => up("quotas", d.quotas.length === 12 ? [] : GRADES.map((g) => d.quotas.find((q) => q.grade === g) ?? { grade: g, capacity: DEFAULT_QUOTA }));

  return (
    <Modal open={open} title={club ? "Дугуйлан засах" : "Шинэ дугуйлан"} onClose={onClose}
           footer={<><Button variant="ghost" onClick={onClose}>Болих</Button><Button type="submit" form="club-form" disabled={busy}>Хадгалах</Button></>}>
      <form id="club-form" onSubmit={save} className="space-y-4">
        {errors.non_field_errors && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.non_field_errors}</p>}
        {errors.detail && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.detail}</p>}
        <Field label="Нэр" error={errors.name}><Input value={d.name} onChange={(e) => up("name", e.target.value)} maxLength={120} required /></Field>
        <Field label="Тайлбар" error={errors.description} hint="Олон мөр бичиж болно"><Textarea value={d.description} onChange={(e) => up("description", e.target.value)} maxLength={5000} /></Field>
        <Field label="Ангиуд ба анги тутмын квот" error={errors.quotas} hint="Анги сонгоод хажууд нь элсэх тоог оруулна">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={allGrades} className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-navy hover:bg-navy/10">Бүгд</button>
            {GRADES.map((g) => (
              <label key={g} className={`cursor-pointer rounded-full border px-3 py-1 text-sm font-semibold ${has(g) ? "border-navy bg-navy text-white" : "border-slate-300 text-slate-700"}`}>
                <input type="checkbox" className="sr-only" checked={has(g)} onChange={() => toggleGrade(g)} />{g}
              </label>
            ))}
          </div>
          {d.quotas.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {d.quotas.map((q) => (
                <label key={q.grade} className="flex items-center gap-2 text-sm">
                  <span className="w-16 shrink-0 text-slate-600">{q.grade}-р анги</span>
                  <Input type="number" min={1} max={500} value={q.capacity} onChange={(e) => setQuota(q.grade, e.target.value)} required aria-label={`${q.grade}-р ангийн квот`} />
                </label>
              ))}
              <p className="col-span-full text-xs text-slate-500">Нийт: {d.quotas.reduce((s, q) => s + (Number(q.capacity) || 0), 0)} суудал</p>
            </div>
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={d.is_paid} onChange={(e) => up("is_paid", e.target.checked)} />Төлбөртэй
          </label>
          {d.is_paid && (
            <>
              <Field label="Дүн (₮)" error={errors.fee}><Input type="number" min={1} value={d.fee} onChange={(e) => up("fee", e.target.value)} required /></Field>
              <Field label="Төлбөрийн тайлбар" error={errors.fee_note} hint="ж: сард, улиралд"><Input value={d.fee_note} onChange={(e) => up("fee_note", e.target.value)} maxLength={120} /></Field>
            </>
          )}
          <Field label="Бүртгэл эхлэх" error={errors.registration_start}><Input type="datetime-local" value={d.registration_start} onChange={(e) => up("registration_start", e.target.value)} required /></Field>
          <Field label="Бүртгэл дуусах" error={errors.registration_end}><Input type="datetime-local" value={d.registration_end} onChange={(e) => up("registration_end", e.target.value)} required /></Field>
        </div>
        <Field label="Зураг" error={errors.images} hint="JPG, PNG, WebP; олон файл сонгож болно. Эхнийх нь картын нүүр зураг болно.">
          <Input type="file" accept="image/*" multiple onChange={(e) => { setFiles((cur) => [...cur, ...Array.from(e.target.files ?? [])]); e.target.value = ""; }} />
        </Field>
        {files.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {files.map((f, i) => (
              <div key={`${f.name}-${i}`} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100">
                {previews[i] && <Image src={previews[i]} alt="" fill unoptimized className="object-cover" />}
                <button type="button" onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))} aria-label={`${f.name} хасах`} title="Хасах"
                        className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-xs text-red-600 shadow">✕</button>
              </div>
            ))}
          </div>
        )}
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={d.is_published} onChange={(e) => up("is_published", e.target.checked)} />Нийтлэх (олон нийтэд харагдана)
        </label>
      </form>
    </Modal>
  );
}
