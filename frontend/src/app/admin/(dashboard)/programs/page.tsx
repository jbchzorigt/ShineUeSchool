"use client";

/* /admin/programs — хөтөлбөрийн жагсаалт, нэмэх/засах форм. */

import { useState } from "react";
import { ProgramForm } from "@/components/admin/programs/ProgramForm";
import { ProgramTable } from "@/components/admin/programs/ProgramTable";
import { Button, Empty, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { ProgramAdmin } from "@/lib/types";

export default function ProgramsAdminPage() {
  const q = useFetch(() => api.programs.list(), []);
  const [editing, setEditing] = useState<ProgramAdmin | null | "new">(null);
  // reload() үед q.data агшин зуур undefined болдог → сүүлийн жагсаалтыг барина (форм unmount хийгдэхгүй)
  const [programs, setPrograms] = useState<ProgramAdmin[] | null>(null);
  if (q.data && q.data !== programs) setPrograms(q.data);

  if (q.error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>;
  if (!programs) return <Spinner />;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy">Хөтөлбөрүүд</h1>
          <p className="text-sm text-slate-600">Нүүр хуудасны картууд ба хөтөлбөр бүрийн хуудас (/programs/…). Бүтээл, тэтгэлгийг ☷-ээс.</p>
        </div>
        <Button onClick={() => setEditing("new")}>Хөтөлбөр нэмэх</Button>
      </div>
      {programs.length === 0 ? <Empty>Хөтөлбөр нэмнэ үү.</Empty> : <ProgramTable programs={programs} onEdit={setEditing} onChanged={q.reload} />}
      {editing !== null && <ProgramForm key={editing === "new" ? "new" : editing.id} program={editing === "new" ? null : editing} open onClose={() => setEditing(null)} onSaved={q.reload} />}
    </div>
  );
}
