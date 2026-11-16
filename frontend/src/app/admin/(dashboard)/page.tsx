"use client";

/* Дашбоардын нүүр: сайтын хандалт (7 хоног/сар/жил), идэвхтэй элсэлтийн хүсэлт, дугуйлангийн бүртгэл, Facebook дагагч,
   сүүлийн сэтгэгдлүүд, олимпиадын тойм. Хэсэг бүр хэрэглэгчийн эрхээр харагдана (backend ч мөн шүүнэ). */

import Link from "next/link";
import { ClipboardCheck, Eye, Shapes, ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import type { AnalyticsRange, AnalyticsSummary, DashboardOverview, Stats } from "@/lib/types";
import { Badge, Card } from "@/components/ui";
import { Kpi } from "@/components/admin/dashboard/Kpi";
import { RecentComments } from "@/components/admin/dashboard/RecentComments";
import { VisitsPanel } from "@/components/admin/dashboard/VisitsPanel";

const fmt = (n: number) => n.toLocaleString("en-US");

export default function DashboardHome() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [overviewError, setOverviewError] = useState("");
  const [range, setRange] = useState<AnalyticsRange>("week");
  const [visits, setVisits] = useState<AnalyticsSummary | null>(null);
  const [visitsError, setVisitsError] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);

  const canAdmissions = !!user && can(user, "admissions");
  const canClubs = !!user && can(user, "clubs");
  const canNews = !!user && can(user, "news");
  const canOlympiad = !!user && can(user, "olympiad");

  useEffect(() => { api.dashboard().then(setOverview).catch(() => setOverviewError("Тоймыг ачаалж чадсангүй.")); }, []);
  useEffect(() => {
    let stale = false;
    api.analytics(range)
      .then((s) => { if (!stale) setVisits(s); })
      .catch(() => { if (!stale) setVisitsError("Хандалтын мэдээллийг ачаалж чадсангүй."); });
    return () => { stale = true; };
  }, [range]);
  useEffect(() => { if (canOlympiad) api.stats().then(setStats).catch(() => {}); }, [canOlympiad]);

  const pickRange = (r: AnalyticsRange) => { setVisitsError(""); setRange(r); };
  const pending = <span className="text-slate-300">—</span>;
  const admission = overview?.admission;
  const clubs = overview?.clubs;
  const fb = overview?.facebook;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy">Нүүр</h1>
        <p className="text-sm text-slate-600">Сайтын хандалт, элсэлт, сэтгэгдлийн товч тойм.</p>
      </div>

      {overviewError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{overviewError}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Eye} label="Өнөөдрийн зочин" value={visits ? fmt(visits.today.visitors) : pending}
          sub={visits ? `${fmt(visits.today.views)} хуудас үзэлт` : "Ачаалж байна"} />
        {canAdmissions && (
          <Kpi icon={ClipboardCheck} label="Элсэлтийн хүсэлт" href="/admin/admissions" accent="#059669"
            value={admission ? fmt(admission.applicants) : pending}
            sub={!overview ? "Ачаалж байна" : admission ? (
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="truncate">{admission.round}</span>
                <Badge tone={admission.registration_open ? "green" : "slate"}>{admission.registration_open ? "Бүртгэл нээлттэй" : "Бүртгэл хаалттай"}</Badge>
              </span>
            ) : "Идэвхтэй элсэлт алга"} />
        )}
        {canClubs && (
          <Kpi icon={Shapes} label="Дугуйлангийн бүртгэл" href="/admin/clubs" accent="#7c3aed"
            value={clubs ? fmt(clubs.registrations) : pending}
            sub={!overview ? "Ачаалж байна" : clubs ? `${clubs.round} — баталгаажсан` : "Идэвхтэй ээлж алга"} />
        )}
        <Kpi icon={ThumbsUp} label="Facebook дагагч" accent="#1877f2"
          value={fb ? fmt(fb.followers) : pending}
          sub={!overview ? "Ачаалж байна" : fb ? fb.name : "Facebook хуудас холбогдоогүй байна"} />
      </div>

      <VisitsPanel range={range} onRange={pickRange} data={visits} error={visitsError} />

      {(canNews || canOlympiad) && (
        <div className={`grid gap-4 ${canNews && canOlympiad ? "xl:grid-cols-2" : ""}`}>
          {canNews && (overview ? <RecentComments comments={overview.comments} /> : !overviewError && <Card className="h-40 animate-pulse bg-slate-50"><span className="sr-only">Ачаалж байна</span></Card>)}
          {canOlympiad && <OlympiadSummary stats={stats} />}
        </div>
      )}
    </div>
  );
}

/** Ү.Маамын нэрэмжит олимпиадын өгөгдлийн товч тойм (өмнөх нүүрний хэсэг) */
function OlympiadSummary({ stats }: { stats: Stats | null }) {
  const tiles = stats ? [
    { label: "Шат", value: stats.stages, href: "/admin/olympiad/schedule" },
    { label: "Үр дүнгийн мөр", value: stats.results, href: "/admin/olympiad/results" },
    { label: "Албумын зураг", value: stats.photos, href: "/admin/olympiad/album" },
    { label: "Сүүлийн он", value: stats.latest_year ?? "—", href: "/admin/olympiad/schedule" },
  ] : [];
  const max = Math.max(1, ...(stats?.results_by_year.map((r) => r.count) ?? []));
  return (
    <Card className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-bold text-navy">Олимпиад</h2>
        <Link href="/admin/olympiad" className="text-sm font-semibold text-navy hover:underline">Олимпиад руу</Link>
      </div>
      {!stats ? (
        <div className="mt-4 h-28 animate-pulse rounded-xl bg-slate-50" />
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {tiles.map((t) => (
              <Link key={t.label} href={t.href} className="rounded-xl bg-slate-50 px-3 py-2 transition hover:bg-navy/5">
                <div className="text-xs font-semibold text-slate-500">{t.label}</div>
                <div className="text-xl font-black tabular-nums text-navy">{t.value}</div>
              </Link>
            ))}
          </div>
          <h3 className="mt-5 text-sm font-semibold text-slate-600">Оноор үр дүнгийн тоо</h3>
          <div className="mt-2 space-y-2">
            {stats.results_by_year.map((r) => (
              <div key={r.year} className="flex items-center gap-3 text-sm">
                <span className="w-12 font-semibold text-slate-700">{r.year}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${(r.count / max) * 100}%` }} />
                </div>
                <span className="w-8 text-right font-semibold tabular-nums text-navy">{r.count}</span>
              </div>
            ))}
            {stats.results_by_year.length === 0 && <p className="text-sm text-slate-500">Үр дүн ороогүй байна.</p>}
          </div>
        </>
      )}
    </Card>
  );
}
