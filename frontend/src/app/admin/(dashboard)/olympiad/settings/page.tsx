"use client";

/* Олимпиадын олон нийтийн хуудасны текст (намтар, тухай, үзүүлэлт, холбоо барих) ба Маам багшийн хөрөг.
   Хэсэг бүр (Хөрөг, Толгой хэсэг, Олимпиадын тухай, Холбоо барих) өөрийн "Хадгалах" товчтой. Хөрөг: файл сонгоход урьдчилж
   харуулна, "Хадгалах" дарахад л upload хийнэ ("Болих" — цуцлах) — зөвхөн тухайн хэсгийн талбаруудыг
   PATCH хийж, "Хадгалагдлаа" гэж баталгаажуулна; хадгалсны дараа /olympiad хуудасны кэш шууд шинэчлэгдэнэ (api.ts afterSave). */

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { OlympiadPage, OlympiadPageInput, OlympiadStat } from "@/lib/types";
import { Button, Card, Field, Input, Spinner, Textarea } from "@/components/ui";

type Section = "portrait" | "hero" | "about" | "contact";
/** Хэсэг бүрийн талбарууд (тус тусдаа хадгална) */
const SECTION_FIELDS: Record<Exclude<Section, "portrait">, (keyof OlympiadPageInput)[]> = {
  hero: ["eyebrow", "title", "bio", "portrait_caption"],
  about: ["about_title", "about_lead", "stats"],
  contact: ["contact_address", "contact_phone", "contact_email"],
};

const toInput = (p: OlympiadPage): OlympiadPageInput => ({
  eyebrow: p.eyebrow, title: p.title, bio: p.bio, portrait_caption: p.portrait_caption, about_title: p.about_title,
  about_lead: p.about_lead, stats: p.stats, contact_address: p.contact_address, contact_phone: p.contact_phone, contact_email: p.contact_email,
});

export default function OlympiadPageAdmin() {
  const q = useFetch(() => api.olympiadPage.get(), []);
  const [form, setForm] = useState<OlympiadPageInput | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Section | null>(null);
  const [saved, setSaved] = useState<Section | null>(null);
  const [dirty, setDirty] = useState<Set<Section>>(new Set());
  const [portraitBusy, setPortraitBusy] = useState(false);
  const [portrait, setPortrait] = useState<string | null | undefined>(undefined);
  const [portraitFile, setPortraitFile] = useState<File | null>(null);   // сонгосон, хадгалаагүй хөрөг
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!portraitFile) return;
    const url = URL.createObjectURL(portraitFile);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URL файлаас гаралтай, cleanup-д чөлөөлнө
    setPortraitPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [portraitFile]);

  // Серверийн өгөгдөл ирэхэд формыг нэг удаа дүүргэнэ (render-д, effect-гүй)
  const data = form ?? (q.data ? toInput(q.data) : null);
  const portraitUrl = portrait === undefined ? (q.data?.portrait_image ?? null) : portrait;
  const set = (patch: Partial<OlympiadPageInput>) => {
    if (!data) return;
    setForm({ ...data, ...patch });
    // Өөрчлөгдсөн хэсгийг тэмдэглэнэ ("Хадгалаагүй өөрчлөлт" анхааруулга)
    const touched = (Object.keys(SECTION_FIELDS) as Exclude<Section, "portrait">[]).filter((s) => SECTION_FIELDS[s].some((k) => k in patch));
    setDirty((d) => new Set([...d, ...touched]));
    if (saved && saved !== "portrait" && touched.includes(saved)) setSaved(null);
  };
  const setStat = (i: number, patch: Partial<OlympiadStat>) => data && set({ stats: data.stats.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  async function save(e: FormEvent, section: Exclude<Section, "portrait">) {
    e.preventDefault();
    if (!data) return;
    setBusy(section); setErrors({}); setSaved(null);
    const patch = Object.fromEntries(SECTION_FIELDS[section].map((k) => [k, data[k]])) as Partial<OlympiadPageInput>;
    try {
      const p = await api.olympiadPage.update(patch);
      // Зөвхөн хадгалсан хэсгийг серверийн утгаар шинэчилнэ (бусад хэсгийн хадгалаагүй засварыг хэвээр үлдээнэ)
      const fresh = toInput(p);
      setForm({ ...data, ...Object.fromEntries(SECTION_FIELDS[section].map((k) => [k, fresh[k]])) });
      setSaved(section);
      setDirty((d) => { const n = new Set(d); n.delete(section); return n; });
    } catch (err) {
      setErrors(err instanceof ApiError ? err.fieldErrors : { [`${section}_error`]: "Хадгалж чадсангүй." });
    } finally { setBusy(null); }
  }

  /** Хэсгийн доод мөр: Хадгалах товч + төлөв */
  const saveBar = (section: Section) => (
    <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
      <Button type="submit" disabled={busy !== null || (section === "portrait" && !portraitFile)}>{busy === section ? "Хадгалж байна…" : "Хадгалах"}</Button>
      {section === "portrait" && portraitFile && <Button type="button" variant="ghost" onClick={cancelPortrait} disabled={busy !== null}>Болих</Button>}
      {saved === section && <span className="text-sm font-medium text-emerald-700">✓ Хадгалагдлаа — олимпиадын хуудсанд шинэчлэгдсэн</span>}
      {saved !== section && dirty.has(section) && <span className="text-sm text-amber-700">Хадгалаагүй өөрчлөлт байна</span>}
      {errors[`${section}_error`] && <span className="text-sm text-red-600">{errors[`${section}_error`]}</span>}
    </div>
  );

  function choosePortrait(file: File) {
    setPortraitFile(file); setSaved(null); setErrors({});
    setDirty((d) => new Set([...d, "portrait"]));
  }

  function cancelPortrait() {
    setPortraitFile(null); setPortraitPreview(null);
    setDirty((d) => { const n = new Set(d); n.delete("portrait"); return n; });
  }

  async function savePortrait(e: FormEvent) {
    e.preventDefault();
    if (!portraitFile) return;
    setPortraitBusy(true); setBusy("portrait"); setErrors({}); setSaved(null);
    try {
      const p = await api.olympiadPage.setPortrait(portraitFile);
      setPortrait(p.portrait_image); setPortraitFile(null); setPortraitPreview(null); setSaved("portrait");
      setDirty((d) => { const n = new Set(d); n.delete("portrait"); return n; });
    }
    catch (err) { setErrors(err instanceof ApiError ? err.fieldErrors : { image: "Зураг оруулж чадсангүй." }); }
    finally { setPortraitBusy(false); setBusy(null); }
  }

  async function removePortrait() {
    if (!confirm("Хөрөг зургийг устгах уу?")) return;
    setPortraitBusy(true);
    try { const p = await api.olympiadPage.removePortrait(); setPortrait(p.portrait_image); setSaved("portrait"); }
    catch { alert("Устгаж чадсангүй."); }
    finally { setPortraitBusy(false); }
  }

  if (q.error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>;
  if (!data) return <Spinner />;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy">Хуудасны тохиргоо</h1>
        <p className="text-sm text-slate-600">Олон нийтийн <code>/olympiad</code> хуудасны намтар, тухай, үзүүлэлт, холбоо барих мэдээлэл. Хуваарь, үр дүн, албум тус тусын хуудаснаас.</p>
      </div>

      <form onSubmit={savePortrait}>
      <Card className="space-y-3">
        <h2 className="font-bold text-navy">Маам багшийн хөрөг</h2>
        <div className="flex flex-wrap items-start gap-4">
          <div className="relative h-48 w-40 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            {(portraitPreview ?? portraitUrl) ? <Image src={(portraitPreview ?? portraitUrl)!} alt="Хөрөг" fill unoptimized sizes="160px" className="object-cover" /> : <span className="grid h-full place-items-center text-xs text-slate-500">Зураг байхгүй</span>}
            {portraitPreview && <span className="absolute inset-x-0 bottom-0 bg-amber-500/90 py-0.5 text-center text-[11px] font-semibold text-white">Шинэ (хадгалаагүй)</span>}
          </div>
          <div className="space-y-2">
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={portraitBusy} aria-label="Хөрөг зураг сонгох"
                   onChange={(e) => { const f = e.target.files?.[0]; if (f) choosePortrait(f); e.target.value = ""; }}
                   className="block text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-navy/90" />
            {errors.image && <p className="text-xs font-medium text-red-600">{errors.image}</p>}
            {portraitUrl && !portraitFile && <Button type="button" variant="danger" onClick={removePortrait} disabled={portraitBusy}>Зураг устгах</Button>}
            <p className="text-xs text-slate-500">JPEG/PNG/WebP, 10 MB хүртэл. Босоо (4:5) зураг тохиромжтой.</p>
          </div>
        </div>
        {saveBar("portrait")}
      </Card>
      </form>

      <div className="space-y-6">
        {errors.non_field_errors && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.non_field_errors}</p>}
        <form onSubmit={(e) => save(e, "hero")}>
        <Card className="space-y-4">
          <h2 className="font-bold text-navy">Толгой хэсэг</h2>
          <Field label="Дээд бичиг" error={errors.eyebrow}><Input value={data.eyebrow} onChange={(e) => set({ eyebrow: e.target.value })} /></Field>
          <Field label="Гарчиг" error={errors.title}><Input value={data.title} onChange={(e) => set({ title: e.target.value })} required /></Field>
          <Field label="Намтар" error={errors.bio}><Textarea rows={6} value={data.bio} onChange={(e) => set({ bio: e.target.value })} /></Field>
          <Field label="Зургийн тайлбар" error={errors.portrait_caption}><Input value={data.portrait_caption} onChange={(e) => set({ portrait_caption: e.target.value })} /></Field>
          {saveBar("hero")}
        </Card>
        </form>
        <form onSubmit={(e) => save(e, "about")}>
        <Card className="space-y-4">
          <h2 className="font-bold text-navy">Олимпиадын тухай</h2>
          <Field label="Гарчиг" error={errors.about_title}><Input value={data.about_title} onChange={(e) => set({ about_title: e.target.value })} /></Field>
          <Field label="Текст" error={errors.about_lead}><Textarea rows={4} value={data.about_lead} onChange={(e) => set({ about_lead: e.target.value })} /></Field>
          <Field label="Үзүүлэлт (1–4)" error={errors.stats}>
            <div className="space-y-2">
              {data.stats.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={s.value} placeholder="2026" onChange={(e) => setStat(i, { value: e.target.value })} className="w-32" />
                  <Input value={s.label} placeholder="Олимпиадын жил" onChange={(e) => setStat(i, { label: e.target.value })} />
                  <Button type="button" variant="ghost" disabled={data.stats.length <= 1} onClick={() => set({ stats: data.stats.filter((_, j) => j !== i) })}>Хасах</Button>
                </div>
              ))}
              {data.stats.length < 4 && <Button type="button" variant="ghost" onClick={() => set({ stats: [...data.stats, { value: "", label: "" }] })}>+ Үзүүлэлт</Button>}
            </div>
          </Field>
          {saveBar("about")}
        </Card>
        </form>
        <form onSubmit={(e) => save(e, "contact")}>
        <Card className="space-y-4">
          <h2 className="font-bold text-navy">Холбоо барих</h2>
          <Field label="Хаяг" error={errors.contact_address}><Input value={data.contact_address} onChange={(e) => set({ contact_address: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Утас" error={errors.contact_phone}><Input value={data.contact_phone} onChange={(e) => set({ contact_phone: e.target.value })} /></Field>
            <Field label="И-мэйл" error={errors.contact_email}><Input value={data.contact_email} onChange={(e) => set({ contact_email: e.target.value })} /></Field>
          </div>
          {saveBar("contact")}
        </Card>
        </form>
      </div>
    </div>
  );
}
