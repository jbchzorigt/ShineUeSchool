"use client";

/* Элсэлтийн ээлж үүсгэх / засах: нэр, кодын угтвар, ангиуд, шалгалтын мэдээлэл. Бүртгэл/дүнгийн товч, эцсийн хугацааг
   ээлжийн самбарын SectionPanel-д тохируулна. Кодын угтварыг (SU27) зөвхөн үүсгэхэд — дараа нь өөрчилбөл өмнө олгосон
   кодуудтай зөрөх тул backend зөвшөөрдөггүй. */

import { useState, type FormEvent } from "react";
import { Button, Field, Input, Modal, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { AdmissionRoundAdmin } from "@/lib/types";

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

export function RoundForm({ round, onClose, onSaved }: { round: AdmissionRoundAdmin | null; onClose: () => void; onSaved: (r: AdmissionRoundAdmin) => void }) {
  const nextYear = new Date().getFullYear() + 1;
  const [d, setD] = useState(() => round ? {
    name: round.name, code_prefix: round.code_prefix, grades: round.grades, test_info: round.test_info,
  } : {
    name: `${nextYear}–${nextYear + 1} оны хичээлийн жилийн элсэлт`, code_prefix: `SU${String(nextYear).slice(2)}`, grades: [1],
    test_info: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const up = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((s) => ({ ...s, [k]: v }));
  const toggleGrade = (g: number) => up("grades", d.grades.includes(g) ? d.grades.filter((x) => x !== g) : [...d.grades, g].sort((a, b) => a - b));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErrors({});
    const body = { name: d.name, grades: d.grades, test_info: d.test_info };
    try {
      onSaved(round ? await api.admissionsAdmin.rounds.update(round.id, body) : await api.admissionsAdmin.rounds.create({ ...body, code_prefix: d.code_prefix }));
      onClose();
    } catch (err) {
      setErrors(err instanceof ApiError ? (Object.keys(err.fieldErrors).length ? err.fieldErrors : { detail: err.message }) : { detail: "Хадгалж чадсангүй." });
    } finally { setBusy(false); }
  }

  return (
    <Modal open size="lg" title={round ? "Элсэлтийн ээлж засах" : "Шинэ элсэлтийн ээлж"} onClose={onClose}
           footer={<><Button variant="ghost" onClick={onClose}>Болих</Button><Button type="submit" form="round-form" disabled={busy}>Хадгалах</Button></>}>
      <form id="round-form" onSubmit={submit} className="space-y-4">
        {(errors.detail || errors.non_field_errors) && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.detail || errors.non_field_errors}</p>}
        <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
          <Field label="Нэр" error={errors.name}><Input value={d.name} onChange={(e) => up("name", e.target.value)} maxLength={120} required /></Field>
          <Field label="Кодын угтвар" error={errors.code_prefix} hint={round ? "Өөрчлөх боломжгүй" : "Жишээ: SU27"}>
            <Input value={d.code_prefix} onChange={(e) => up("code_prefix", e.target.value.toUpperCase())} maxLength={8} disabled={!!round} required className="font-mono" />
          </Field>
        </div>
        {/* Field нь <label> — дотор нь олон товч байвал label дээр дарахад эхний товч идэвхждэг тул fieldset */}
        <fieldset>
          <legend className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Элсэлт авах ангиуд</legend>
          <div className="flex flex-wrap gap-2">
            {GRADES.map((g) => (
              <button key={g} type="button" onClick={() => toggleGrade(g)} aria-pressed={d.grades.includes(g)} aria-label={`${g}-р анги`}
                      className={`h-9 w-11 rounded-lg border text-sm font-semibold ${d.grades.includes(g) ? "border-navy bg-navy text-white" : "border-slate-300 bg-white text-slate-700 hover:border-navy"}`}>{g}</button>
            ))}
          </div>
          {errors.grades && <span className="mt-1 block text-xs font-medium text-red-600">{errors.grades}</span>}
        </fieldset>
        <Field label="Шалгалтын мэдээлэл" error={errors.test_info} hint="Огноо, цаг, байршил, авчрах зүйл. Бүртгэлийн хэсэг болон бүртгэлийн баталгаажуулах имэйлд гарна.">
          <Textarea value={d.test_info} onChange={(e) => up("test_info", e.target.value)} maxLength={5000} rows={5} />
        </Field>
      </form>
    </Modal>
  );
}
