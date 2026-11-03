"use client";

/* Элсэлтийн нэг хэсэг (шалгалтын бүртгэл эсвэл дүн): асаах/унтраах товч + эцсийн хугацаа.
   Асаахад ирээдүйн хугацаа заавал (backend ч шалгана). Хугацаа өнгөрмөгц backend товчийг автоматаар унтраадаг —
   энд "Хугацаа дууссан — автоматаар унтарсан" гэж харагдаж, шинэ хугацаа тавьж дахин асаах хүртэл сайтад гарахгүй. */

import { useState, type ReactNode } from "react";
import { fromLocalInput, toLocalInput } from "@/components/admin/clubs/datetime";
import { sectionStatus } from "@/components/admission/format";
import { formatDateTime } from "@/components/news/format";
import { Badge, Button, Input } from "@/components/ui";
import type { AdmissionSectionAdmin } from "@/lib/types";

export function SectionPanel({ title, hint, section, busy, blockedReason, onSave, children }: {
  title: string; hint: string; section: AdmissionSectionAdmin; busy: boolean;
  /** Асаах боломжгүй шалтгаан (жишээ нь ээлж идэвхгүй) — товчийг идэвхгүй болгоно */
  blockedReason?: string;
  onSave: (p: { enabled?: boolean; deadline?: string }) => Promise<boolean>;
  children?: ReactNode;
}) {
  const [deadline, setDeadline] = useState(section.deadline ? toLocalInput(section.deadline) : "");
  const [error, setError] = useState("");
  const status = sectionStatus(section);
  const dirty = (deadline ? fromLocalInput(deadline) : "") !== (section.deadline ? new Date(section.deadline).toISOString() : "");

  const futureOrError = () => {
    if (!deadline) { setError("Эцсийн хугацаа оруулна уу."); return null; }
    const iso = fromLocalInput(deadline);
    if (new Date(iso) <= new Date()) { setError("Эцсийн хугацаа ирээдүйд байх ёстой."); return null; }
    return iso;
  };

  async function toggle() {
    setError("");
    if (section.enabled) { await onSave({ enabled: false }); return; }
    const iso = futureOrError();
    if (iso) await onSave({ enabled: true, deadline: iso });
  }

  async function saveDeadline() {
    setError("");
    const iso = section.enabled ? futureOrError() : deadline ? fromLocalInput(deadline) : null;
    if (iso) await onSave({ deadline: iso });
  }

  return (
    <section className={`flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm ${section.enabled ? "border-emerald-300" : section.expired ? "border-red-200" : "border-slate-200"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-navy">{title}</h3>
          <p className="text-xs text-slate-500">{hint}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={section.enabled}
          aria-label={`${title}: ${section.enabled ? "унтраах" : "асаах"}`}
          disabled={busy || (!section.enabled && !!blockedReason)}
          onClick={toggle}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 disabled:opacity-50 ${section.enabled ? "bg-emerald-600" : "bg-slate-300"}`}
        >
          <span className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${section.enabled ? "translate-x-6" : ""}`} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={status.tone}>{status.label}</Badge>
        {section.deadline && (
          <span className="text-xs text-slate-600 tabular-nums">
            {section.expired ? "Дууссан" : "Дуусах"}: {formatDateTime(section.deadline)}
          </span>
        )}
      </div>

      {!section.enabled && section.expired && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          Эцсийн хугацаа өнгөрсөн тул автоматаар унтарч сайтаас нуугдсан. Дахин нээх бол шинэ хугацаа тавиад асаана уу.
        </p>
      )}
      {blockedReason && !section.enabled && <p className="text-xs text-slate-500">{blockedReason}</p>}

      <div className="flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Эцсийн хугацаа</span>
          {/* ui.tsx-ийн Input нь w-full — өргөнийг wrapper-ээр */}
          <span className="block w-56"><Input type="datetime-local" value={deadline} onChange={(e) => { setDeadline(e.target.value); setError(""); }} /></span>
        </label>
        <Button variant="ghost" className="border border-slate-300" disabled={busy || !dirty || !deadline} onClick={saveDeadline}>Хугацаа хадгалах</Button>
      </div>
      {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}

      {children}
    </section>
  );
}
