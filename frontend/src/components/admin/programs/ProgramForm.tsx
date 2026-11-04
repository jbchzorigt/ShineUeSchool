"use client";

/* Хөтөлбөр үүсгэх/засах Modal: "Монгол | English" таб (нэр, summary (280), хэрэгжилт RichText — англи хоосон бол /en сайтад монгол),
   badge, анги, нийтлэх, cover (preview).
   Хадгалах: create/update → cover файл сонгосон бол setCover. Засах үед slug зөвхөн уншигдана. */

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { RichText } from "@/components/admin/RichText";
import { LangTabs, langPane } from "@/components/admin/LangTabs";
import type { Lang } from "@/lib/i18n";
import { Button, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { ProgramAdmin, ProgramInput } from "@/lib/types";

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);
const EMPTY: ProgramInput = { name: "", name_en: "", badge: "", summary: "", summary_en: "", grade_from: 11, grade_to: 12, body_html: "", body_html_en: "", is_published: true };

export function ProgramForm({ program, open, onClose, onSaved }: { program: ProgramAdmin | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<ProgramInput>(() => program ? { name: program.name, name_en: program.name_en, badge: program.badge, summary: program.summary, summary_en: program.summary_en, grade_from: program.grade_from, grade_to: program.grade_to, body_html: program.body_html, body_html_en: program.body_html_en, is_published: program.is_published } : EMPTY);
  // Шинээр үүсгэх үед create() амжилттай болсны дараа тухайн бичлэгийг энд хадгална:
  // ингэснээр cover upload амжилтгүй болсон ч дахин "Хадгалах" дарахад ДАВХАР бичлэг үүсгэхгүй, харин update() руу шилжинэ.
  const [saved, setSaved] = useState<ProgramAdmin | null>(program);
  const current = saved;
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(program?.cover_image ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Lang>("mn");
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URL файлаас гаралтай, cleanup-д чөлөөлнө
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const up = <K extends keyof ProgramInput>(k: K, v: ProgramInput[K]) => setD((x) => ({ ...x, [k]: v }));

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErrors({});
    const body = { ...d, name: d.name.trim(), name_en: (d.name_en ?? "").trim(), badge: d.badge.trim(), summary: d.summary.trim(), summary_en: (d.summary_en ?? "").trim() };
    try {
      const result = current ? await api.programs.update(current.id, body) : await api.programs.create(body);
      setSaved(result);
      if (file) {
        try {
          await api.programs.setCover(result.id, file);
        } catch (err) {
          // Хөтөлбөр аль хэдийн хадгалагдсан тул жагсаалтыг сэргээнэ; Modal-ыг ЗАСАХ горимд нээлттэй үлдээж,
          // file-ыг цэвэрлэхгүйгээр дахин оролдох боломж үлдээнэ (дараагийн "Хадгалах" нь create биш update дуудна).
          onSaved();
          const m = err instanceof ApiError ? err.fieldErrors.image : undefined;
          setErrors({ image: m ? `Хөтөлбөр хадгалагдсан, гэвч cover: ${m}` : "Хөтөлбөр хадгалагдсан, гэвч cover зураг орж чадсангүй. Дахин оролдоно уу." });
          return;
        }
      }
      onSaved(); onClose();
    } catch (err) {
      const fe = err instanceof ApiError ? err.fieldErrors : {};
      setErrors(Object.keys(fe).length ? fe : { non_field_errors: err instanceof ApiError ? err.message : "Хадгалж чадсангүй." });
    } finally { setBusy(false); }
  }

  async function removeCover() {
    if (!current || !confirm("Cover зургийг устгах уу?")) return;
    try { const p = await api.programs.removeCover(current.id); setCover(p.cover_image); setFile(null); setPreview(null); onSaved(); }
    catch { setErrors({ image: "Устгаж чадсангүй." }); }
  }

  const shown = preview ?? cover;
  return (
    <Modal open={open} title={current ? "Хөтөлбөр засах" : "Хөтөлбөр нэмэх"} onClose={onClose} size="lg"
           footer={<><Button variant="ghost" type="button" onClick={onClose}>Болих</Button><Button type="submit" form="program-form" disabled={busy}>{busy ? "Хадгалж байна…" : "Хадгалах"}</Button></>}>
      <form id="program-form" onSubmit={save} className="space-y-4">
        {errors.non_field_errors && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.non_field_errors}</p>}
        <LangTabs value={tab} onChange={setTab} enFilled={!!(d.name_en ?? "").trim()} />
        <div className={langPane(tab === "mn")}>
          <Field label="Нэр" error={errors.name}><Input value={d.name} onChange={(e) => up("name", e.target.value)} maxLength={120} autoFocus placeholder="IB Diploma Programme" /></Field>
          <Field label={`Товч тайлбар (${d.summary.length}/280)`} error={errors.summary}><Textarea value={d.summary} onChange={(e) => up("summary", e.target.value)} maxLength={280} className="min-h-20" /></Field>
        </div>
        <div className={langPane(tab === "en")}>
          <Field label="Name (English)" error={errors.name_en} hint="Хоосон бол англи сайтад монгол нэр"><Input value={d.name_en ?? ""} onChange={(e) => up("name_en", e.target.value)} maxLength={120} lang="en" placeholder="IB Diploma Programme" /></Field>
          <Field label={`Summary (English) (${(d.summary_en ?? "").length}/280)`} error={errors.summary_en}><Textarea value={d.summary_en ?? ""} onChange={(e) => up("summary_en", e.target.value)} maxLength={280} lang="en" className="min-h-20" /></Field>
        </div>
        <Field label="Badge" error={errors.badge} hint="Картын tag (хоёр хэлэнд ижил)"><Input value={d.badge} onChange={(e) => up("badge", e.target.value)} maxLength={40} placeholder="IBDP" /></Field>
        {current && <p className="text-xs text-slate-500">Хаяг: /programs/{current.slug} · /en/programs/{current.slug}</p>}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Эхлэх анги" error={errors.grade_from}><Select value={d.grade_from} onChange={(e) => up("grade_from", Number(e.target.value))}>{GRADES.map((g) => <option key={g} value={g}>{g}-р анги</option>)}</Select></Field>
          <Field label="Төгсөх анги" error={errors.grade_to}><Select value={d.grade_to} onChange={(e) => up("grade_to", Number(e.target.value))}>{GRADES.map((g) => <option key={g} value={g}>{g}-р анги</option>)}</Select></Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.is_published} onChange={(e) => up("is_published", e.target.checked)} className="h-4 w-4 accent-navy" />Нүүр хуудсанд харуулах</label>
        <div className="flex items-start gap-4">
          <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            {shown ? <Image src={shown} alt="" fill unoptimized sizes="160px" className="object-cover" /> : <span className="grid h-full place-items-center text-xs text-slate-500">Cover байхгүй</span>}
          </div>
          <div className="space-y-2">
            <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Cover зураг сонгох" onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
                   className="block text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-navy/90" />
            {errors.image && <p className="text-xs font-medium text-red-600">{errors.image}</p>}
            {current && cover && !file && <Button variant="danger" type="button" onClick={removeCover}>Зураг устгах</Button>}
            <p className="text-xs text-slate-500">JPEG/PNG/WebP, 10 MB хүртэл. 16:10 харьцаа тохиромжтой.</p>
          </div>
        </div>
        <div className={tab === "mn" ? "" : "hidden"}>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Хөтөлбөрийн хэрэгжилт</span>
          <RichText value={d.body_html} onChange={(html) => up("body_html", html)} onUploadImage={(f) => api.programs.uploadImage(f).then((r) => r.url)} />
          {errors.body_html && <p className="mt-1 text-xs font-medium text-red-600">{errors.body_html}</p>}
        </div>
        <div className={tab === "en" ? "" : "hidden"}>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">About the programme (English)</span>
          <RichText value={d.body_html_en ?? ""} onChange={(html) => up("body_html_en", html)} onUploadImage={(f) => api.programs.uploadImage(f).then((r) => r.url)} />
          {errors.body_html_en && <p className="mt-1 text-xs font-medium text-red-600">{errors.body_html_en}</p>}
        </div>
      </form>
    </Modal>
  );
}
