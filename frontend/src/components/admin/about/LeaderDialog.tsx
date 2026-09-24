"use client";

/* Удирдлагын гишүүн үүсгэх/засах Modal: нэр, албан тушаал, түвшин, зураг (preview). Үүсгэх: multipart нэг хүсэлт;
   засах: PATCH + (зураг сонгосон бол) setPhoto. "Зураг устгах" зөвхөн засах үед. */

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Field, Input, Modal, Select } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { AboutLeader, AboutLeaderInput } from "@/lib/types";

export function LeaderDialog({ leader, defaultLevel, levels, open, onClose, onSaved }: {
  leader: AboutLeader | null; defaultLevel: number; levels: number[]; open: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [d, setD] = useState<AboutLeaderInput>(() => leader ? { full_name: leader.full_name, position: leader.position, level: leader.level } : { full_name: "", position: "", level: defaultLevel });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(leader?.photo ?? null);
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
    setBusy(true); setErrors({});
    const body = { full_name: d.full_name.trim(), position: d.position.trim(), level: d.level };
    try {
      if (leader) {
        await api.about.leaders.update(leader.id, body);
        if (file) await api.about.leaders.setPhoto(leader.id, file);
      } else {
        await api.about.leaders.create(body, file);
      }
      onSaved(); onClose();
    } catch (err) {
      const fe = err instanceof ApiError ? err.fieldErrors : {};
      setErrors(Object.keys(fe).length ? fe : { non_field_errors: err instanceof ApiError ? err.message : "Хадгалж чадсангүй." });
    } finally { setBusy(false); }
  }

  async function removePhoto() {
    if (!leader || !confirm("Зургийг устгах уу?")) return;
    try { const l = await api.about.leaders.removePhoto(leader.id); setPhoto(l.photo); setFile(null); setPreview(null); onSaved(); }
    catch { setErrors({ photo: "Устгаж чадсангүй." }); }
  }

  const shown = preview ?? photo;
  return (
    <Modal open={open} title={leader ? "Гишүүн засах" : "Гишүүн нэмэх"} onClose={onClose}
           footer={<><Button variant="ghost" type="button" onClick={onClose}>Болих</Button><Button type="submit" form="leader-form" disabled={busy}>{busy ? "Хадгалж байна…" : "Хадгалах"}</Button></>}>
      <form id="leader-form" onSubmit={save} className="space-y-4">
        {errors.non_field_errors && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.non_field_errors}</p>}
        <Field label="Овог, нэр" error={errors.full_name}><Input value={d.full_name} onChange={(e) => setD({ ...d, full_name: e.target.value })} maxLength={120} autoFocus /></Field>
        <Field label="Албан тушаал" error={errors.position}><Input value={d.position} onChange={(e) => setD({ ...d, position: e.target.value })} maxLength={160} placeholder="Захирал" /></Field>
        <Field label="Түвшин" error={errors.level} hint="1 — захирал, 2 — дэд захирлууд, 3+ — менежер, ахлахууд. Шинэ түвшинг жагсаалтын «Түвшин нэмэх»-ээр нэмнэ.">
          <Select value={d.level} onChange={(e) => setD({ ...d, level: Number(e.target.value) })}>
            {levels.map((lv) => <option key={lv} value={lv}>{lv}-р түвшин</option>)}
          </Select>
        </Field>
        <div className="flex items-start gap-4">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
            {shown ? <Image src={shown} alt="" fill unoptimized sizes="96px" className="object-cover" /> : <span className="grid h-full place-items-center text-xs text-slate-500">Зураггүй</span>}
          </div>
          <div className="space-y-2">
            <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Зураг сонгох"
                   onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
                   className="block text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-navy/90" />
            {errors.photo && <p className="text-xs font-medium text-red-600">{errors.photo}</p>}
            {leader && photo && !file && <Button variant="danger" type="button" onClick={removePhoto}>Зураг устгах</Button>}
            <p className="text-xs text-slate-500">JPEG/PNG/WebP, 10 MB хүртэл. Дөрвөлжин зураг тохиромжтой.</p>
          </div>
        </div>
      </form>
    </Modal>
  );
}
