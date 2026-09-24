"use client";

/* /admin/about/leaders — удирдлагын гишүүд (түвшин 1–10), нэмэх/засах dialog, түвшин нэмэх. */

import { useState } from "react";
import { LeaderDialog } from "@/components/admin/about/LeaderDialog";
import { LeaderList } from "@/components/admin/about/LeaderList";
import { Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { AboutLeader } from "@/lib/types";

const LEVEL_MAX = 10;   // backend LEVEL_MAX-тай ижил

export default function LeadersAdminPage() {
  const q = useFetch(() => api.about.leaders.list(), []);
  const [dialog, setDialog] = useState<{ leader: AboutLeader | null; level: number } | null>(null);
  // reload() дуудагдахад q.data агшин зуур undefined болдог (useFetch); хэрэв dialog нээлттэй үед үүнд
  // тулгуурлаж Spinner үзүүлбэл LeaderDialog unmount хийгдэж, дотоод state (жишээ нь зураг устгасан
  // байдал) алдагдана. Тиймээс сүүлд амжилттай ирсэн жагсаалтыг state-д барьж, дахин ачаалах хооронд харуулна.
  const [leaders, setLeaders] = useState<AboutLeader[] | null>(null);
  if (q.data && q.data !== leaders) setLeaders(q.data);
  // Харагдах түвшин: гишүүдийн хамгийн их түвшин (багадаа 1); «Түвшин нэмэх» хоосон блок нэмнэ (гишүүн орсны дараа л хадгалагдана)
  const [want, setWant] = useState(0);
  const maxUsed = Math.max(1, ...(leaders ?? []).map((l) => l.level));
  const shown = Math.min(LEVEL_MAX, Math.max(maxUsed, want));
  const levels = Array.from({ length: shown }, (_, i) => i + 1);

  if (q.error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error}</p>;
  if (!leaders) return <Spinner />;
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy">Удирдлага</h1>
        <p className="text-sm text-slate-600">Олон нийтийн хуудсанд түвшин бүр нэг мөрөөр, энд байгаа дарааллаар харагдана.</p>
      </div>
      <LeaderList leaders={leaders} levels={levels} canAddLevel={shown < LEVEL_MAX} onAdd={(level) => setDialog({ leader: null, level })} onAddLevel={() => setWant(shown + 1)}
                  onRemoveLevel={() => setWant(shown - 1)} onEdit={(l) => setDialog({ leader: l, level: l.level })} onChanged={q.reload} />
      {dialog && <LeaderDialog key={dialog.leader?.id ?? "new"} leader={dialog.leader} defaultLevel={dialog.level} levels={levels} open onClose={() => setDialog(null)} onSaved={q.reload} />}
    </div>
  );
}
