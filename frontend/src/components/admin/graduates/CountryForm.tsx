"use client";

/* Улс нэмэх/засах Modal: улсыг каталогоос (тивээр бүлэглэсэн select) сонгоход тив автоматаар харагдана;
   сургуулиудыг мөр мөрөөр бичнэ (textarea, нэг мөр = нэг сургууль). Засах үед улс солигдохгүй (зөвхөн сургуулиуд). */

import { useMemo, useState, type FormEvent } from "react";
import { Button, Field, Modal, Select, Textarea } from "@/components/ui";
import { CONTINENTS, type Continent } from "@/lib/home-data";
import { api, ApiError } from "@/lib/api";
import type { CountryCatalogueItem, GraduateDestination } from "@/lib/types";

const ORDER: Continent[] = ["asia", "europe", "north_america", "oceania", "other"];

export function CountryForm({ item, catalogue, taken, onClose, onSaved }: {
  item: GraduateDestination | null; catalogue: CountryCatalogueItem[]; taken: string[]; onClose: () => void; onSaved: () => void;
}) {
  const [code, setCode] = useState(item?.code ?? "");
  const [text, setText] = useState(item?.universities.join("\n") ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const groups = useMemo(() => ORDER.map((c) => ({ c, items: catalogue.filter((i) => i.continent === c && (i.code === item?.code || !taken.includes(i.code))) })), [catalogue, taken, item]);
  const picked = catalogue.find((i) => i.code === code);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErrors({});
    const universities = text.split("\n").map((l) => l.trim()).filter(Boolean);
    try {
      if (item) await api.graduates.update(item.id, universities);
      else await api.graduates.create({ code, universities });
      onSaved(); onClose();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setErrors(err.fieldErrors);
      else setErrors({ _: err instanceof ApiError ? err.message : "Хадгалж чадсангүй." });
    } finally { setBusy(false); }
  }

  return (
    <Modal open title={item ? `${item.name} — сургуулиуд` : "Улс нэмэх"} onClose={onClose}
           footer={<><Button variant="secondary" type="button" onClick={onClose}>Болих</Button><Button type="submit" form="country-form" disabled={busy}>{busy ? "Хадгалж байна…" : "Хадгалах"}</Button></>}>
      <form id="country-form" onSubmit={save} className="space-y-4">
        {errors._ && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors._}</p>}
        <Field label="Улс" error={errors.code}>
          <Select value={code} onChange={(e) => setCode(e.target.value)} disabled={!!item} required>
            <option value="">— Улс сонгох —</option>
            {groups.map((g) => (
              <optgroup key={g.c} label={CONTINENTS[g.c].name}>
                {g.items.map((i) => <option key={i.code} value={i.code}>{i.name}</option>)}
              </optgroup>
            ))}
          </Select>
        </Field>
        {/* Тив: сонгосон улсаас автоматаар */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Тив</span>
          {picked ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 font-medium text-navy">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: CONTINENTS[picked.continent].color }} aria-hidden="true" />
              {CONTINENTS[picked.continent].name}
            </span>
          ) : <span className="text-slate-400">улс сонгоход автоматаар</span>}
        </div>
        <Field label="Сургуулиуд" error={errors.universities} hint="Нэг мөрөнд нэг сургууль. Давхардсан нэр нэг удаа хадгалагдана.">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder={"Massachusetts Institute of Technology\nStanford University"} required />
        </Field>
      </form>
    </Modal>
  );
}
