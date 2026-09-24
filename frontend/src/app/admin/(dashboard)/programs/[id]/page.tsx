"use client";

/* /admin/programs/[id] — хөтөлбөрийн бүтээл ба тэтгэлэг (tab ?tab=works|scholarships). */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ScholarshipsPanel } from "@/components/admin/programs/ScholarshipsPanel";
import { WorksPanel } from "@/components/admin/programs/WorksPanel";
import { Badge, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { ProgramAdminDetail } from "@/lib/types";

type Tab = "works" | "scholarships";
// Tab bar-ыг зөвхөн `program` ачаалсны дараа render хийдэг (SSR ба клиентийн эхний render хоёулаа
// доорх Spinner-ийг харуулна), тиймээс энд window.location уншсан ч hydration mismatch гарахгүй.
// Хэрэв ирээдүйд tab-уудыг өгөгдөл ирэхээс өмнө render хийх бол useSearchParams() руу шилжих хэрэгтэй.
function initialTab(): Tab {
  if (typeof window === "undefined") return "works";
  return new URLSearchParams(window.location.search).get("tab") === "scholarships" ? "scholarships" : "works";
}

export default function ProgramDetailAdminPage() {
  const id = Number(useParams<{ id: string }>().id);
  const q = useFetch(() => (id ? api.programs.get(id) : null), [id]);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [program, setProgram] = useState<ProgramAdminDetail | null>(null);
  if (q.data && q.data !== program) setProgram(q.data);
  if (program && program.id !== id) setProgram(null);
  const pick = (t: Tab) => { setTab(t); history.replaceState(null, "", `?tab=${t}`); };

  if (q.error && !program) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>;
  if (!program) return <Spinner />;
  return (
    <div className="space-y-6">
      {q.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>}
      <div>
        <Link href="/admin/programs" className="text-sm font-medium text-navy hover:underline">← Хөтөлбөрүүд</Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-black text-navy">{program.name}</h1>
          <Badge tone="navy">{program.badge}</Badge>
          <a href={`/programs/${program.slug}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-navy hover:underline">Хуудсыг харах ↗</a>
        </div>
      </div>
      <nav aria-label="Хэсгүүд" className="flex gap-1 border-b border-slate-200">
        {([["works", "Бүтээлийн булан"], ["scholarships", "Тэтгэлэг"]] as [Tab, string][]).map(([t, label]) => (
          <button key={t} type="button" onClick={() => pick(t)} aria-current={tab === t ? "page" : undefined}
                  className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${tab === t ? "border-navy text-navy" : "border-transparent text-slate-600 hover:text-navy"}`}>{label}</button>
        ))}
      </nav>
      {tab === "works" && <WorksPanel programId={program.id} works={program.works} onChanged={q.reload} />}
      {tab === "scholarships" && <ScholarshipsPanel programId={program.id} items={program.scholarships} onChanged={q.reload} />}
    </div>
  );
}
