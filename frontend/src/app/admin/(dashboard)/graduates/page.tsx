"use client";

/* /admin/graduates — нүүрний «Төгсөлт»: тоонууд (StatsForm) + төгсөгчид элссэн улс, сургуулиуд (газрын зураг). Улс каталогоос, тив автоматаар. */

import { useState } from "react";
import { CountryForm } from "@/components/admin/graduates/CountryForm";
import { StatsForm } from "@/components/admin/graduates/StatsForm";
import { CountryTable } from "@/components/admin/graduates/CountryTable";
import { Button, Empty, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { CountryCatalogueItem, GraduateDestination } from "@/lib/types";

export default function GraduatesAdminPage() {
  const q = useFetch(() => api.graduates.list(), []);
  const cat = useFetch(() => api.graduates.catalogue(), []);
  const [editing, setEditing] = useState<GraduateDestination | null | "new">(null);
  // reload() үед q.data агшин зуур undefined болдог → сүүлийн жагсаалтыг барина (форм unmount хийгдэхгүй)
  const [items, setItems] = useState<GraduateDestination[] | null>(null);
  if (q.data && q.data !== items) setItems(q.data);
  const [catalogue, setCatalogue] = useState<CountryCatalogueItem[] | null>(null);
  if (cat.data && cat.data !== catalogue) setCatalogue(cat.data);

  if (q.error || cat.error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{q.error ?? cat.error}</p>;
  if (!items || !catalogue) return <Spinner />;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy">Төгсөгчид</h1>
          <p className="text-sm text-slate-600">Нүүрний «Төгсөлт» хэсгийн газрын зураг: төгсөгчид элссэн улс, сургуулиуд. Тив улсаас автоматаар тодорхойлогдоно.</p>
        </div>
        <Button onClick={() => setEditing("new")}>Улс нэмэх</Button>
      </div>
      <StatsForm />
      <h2 className="text-lg font-bold text-navy">Улс, сургуулиуд</h2>
      {items.length === 0 ? <Empty>Улс нэмнэ үү — газрын зураг нүүрэнд улс нэмсний дараа харагдана.</Empty>
        : <CountryTable items={items} onEdit={setEditing} onChanged={q.reload} />}
      {editing !== null && (
        <CountryForm key={editing === "new" ? "new" : editing.id} item={editing === "new" ? null : editing} catalogue={catalogue}
                     taken={items.map((d) => d.code)} onClose={() => setEditing(null)} onSaved={q.reload} />
      )}
    </div>
  );
}
