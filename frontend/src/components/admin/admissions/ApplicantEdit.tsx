"use client";

/* Нэг элсэгчийн оноо, дүнг гараар засах / цуцлах (татгалзсан бол нийтийн дүнд гарахгүй). */

import { useState, type FormEvent } from "react";
import { RESULT_LABEL, RESULT_ORDER } from "@/components/admission/format";
import { Button, Field, Input, Modal, Select } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { AdmissionApplicantAdmin, AdmissionResult } from "@/lib/types";

export function ApplicantEdit({ a, onClose, onSaved }: { a: AdmissionApplicantAdmin; onClose: () => void; onSaved: () => void }) {
  const [score, setScore] = useState(a.score === null ? "" : String(a.score));
  const [result, setResult] = useState<AdmissionResult | "">(a.result ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(p: Promise<unknown>) {
    setBusy(true); setError("");
    try { await p; onSaved(); onClose(); }
    catch (e) { setError(e instanceof ApiError ? Object.values(e.fieldErrors)[0] ?? e.message : "Хадгалж чадсангүй."); }
    finally { setBusy(false); }
  }

  function save(e: FormEvent) {
    e.preventDefault();
    const n = score.trim() === "" ? null : Number(score.replace(",", "."));
    if (n !== null && (Number.isNaN(n) || n < 0 || n > 1000)) { setError("Оноо 0–1000 хооронд тоо байх ёстой."); return; }
    const { update } = api.admissionsAdmin.applicants;
    if (n === null && result === "") { run(update(a.id, { clear_result: true })); return; }
    // PATCH-д хоосон талбар "өөрчлөхгүй" гэсэн үг тул нэгийг нь хоосолсон бол эхлээд цэвэрлээд дараа нь тохируулна
    const clearFirst = (n === null && a.score !== null) || (result === "" && a.result !== null);
    run((clearFirst ? update(a.id, { clear_result: true }) : Promise.resolve())
      .then(() => update(a.id, { score: n ?? undefined, result: result || undefined })));
  }

  const withdrawn = a.status === "withdrawn";
  return (
    <Modal open title={`${a.code} · ${a.child_last_name} ${a.child_first_name}`} onClose={onClose}
           footer={<>
             <Button variant="ghost" className="mr-auto" disabled={busy}
                     onClick={() => run(api.admissionsAdmin.applicants.update(a.id, { status: withdrawn ? "registered" : "withdrawn" }))}>
               {withdrawn ? "Бүртгэлийг сэргээх" : "Татгалзсан гэж тэмдэглэх"}
             </Button>
             <Button variant="ghost" onClick={onClose}>Болих</Button>
             <Button type="submit" form="applicant-form" disabled={busy}>Хадгалах</Button>
           </>}>
      <form id="applicant-form" onSubmit={save} className="space-y-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Оноо"><Input inputMode="decimal" value={score} onChange={(e) => setScore(e.target.value)} placeholder="—" /></Field>
          <Field label="Дүн">
            <Select value={result} onChange={(e) => setResult(e.target.value as AdmissionResult | "")}>
              <option value="">— (оруулаагүй)</option>
              {RESULT_ORDER.map((r) => <option key={r} value={r}>{RESULT_LABEL[r]}</option>)}
            </Select>
          </Field>
        </div>
        <p className="text-xs text-slate-500">Оноо, дүн хоёуланг хоосолж хадгалбал дүнг устгана. Татгалзсан элсэгч нийтийн дүнд харагдахгүй.</p>
      </form>
    </Modal>
  );
}
