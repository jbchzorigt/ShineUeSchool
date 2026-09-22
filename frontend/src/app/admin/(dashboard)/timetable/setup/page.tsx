"use client";

/* Тохиргоо: 5 таб. ?tab= query-гээр сонгоно (тойм хуудасны картууд шууд холбогдоно). */

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Empty, Spinner } from "@/components/ui";
import { useYear } from "@/components/timetable/useYear";
import { YearSelect } from "@/components/timetable/YearSelect";
import { PeriodsTab } from "@/components/admin/timetable/PeriodsTab";
import { ClassesTab } from "@/components/admin/timetable/ClassesTab";
import { SubjectsTab } from "@/components/admin/timetable/SubjectsTab";
import { TeachersTab } from "@/components/admin/timetable/TeachersTab";
import { RoomsTab } from "@/components/admin/timetable/RoomsTab";

const TABS = [
  { key: "periods", label: "Цагийн хүснэгт" }, { key: "classes", label: "Ангиуд" }, { key: "subjects", label: "Хичээлүүд" },
  { key: "teachers", label: "Багш нар" }, { key: "rooms", label: "Өрөөнүүд" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function SetupTabs() {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = (TABS.some((t) => t.key === sp.get("tab")) ? sp.get("tab") : "periods") as TabKey;
  const { years, yearId, setYearId, loading } = useYear();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy">Тохиргоо</h1>
          <p className="text-sm text-slate-600">Цагийн хүснэгт ба ангиуд жилээр; хичээл, багш, өрөө бүх жилд нийтлэг.</p>
        </div>
        <YearSelect years={years} value={yearId} onChange={setYearId} />
      </div>
      <div role="tablist" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => router.replace(`/admin/timetable/setup?tab=${t.key}`)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === t.key ? "bg-navy text-white" : "bg-slate-100 text-slate-700 hover:bg-navy/10"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {loading ? <Spinner /> : (tab === "periods" || tab === "classes") && !yearId ? (
        <Empty>Эхлээд &quot;Тойм&quot; хэсэгт хичээлийн жил үүсгэнэ үү.</Empty>
      ) : (
        <>
          {tab === "periods" && yearId && <PeriodsTab yearId={yearId} />}
          {tab === "classes" && yearId && <ClassesTab yearId={yearId} />}
          {tab === "subjects" && <SubjectsTab />}
          {tab === "teachers" && <TeachersTab />}
          {tab === "rooms" && <RoomsTab />}
        </>
      )}
    </div>
  );
}

export default function SetupPage() {
  return <Suspense fallback={<Spinner />}><SetupTabs /></Suspense>;
}
