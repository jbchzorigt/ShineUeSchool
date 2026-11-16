"use client";

/* Сайтын хандалтын самбар: 7 хоног / сар / жил сонголт, нийт зочин ба үзэлт, ApexCharts график, их үзсэн 5 хуудас.
   Өгөгдлийг эцэг (нүүр хуудас) татна — "Өнөөдрийн зочин" KPI-тай нэг хүсэлт. */

import type { AnalyticsRange, AnalyticsSummary } from "@/lib/types";
import { pageLabel } from "@/lib/page-label";
import { Card, Spinner } from "@/components/ui";
import { VisitsChart } from "./VisitsChart";

const RANGES: { key: AnalyticsRange; label: string; caption: string }[] = [
  { key: "week", label: "7 хоног", caption: "Сүүлийн 7 хоног" },
  { key: "month", label: "Сар", caption: "Сүүлийн 30 хоног" },
  { key: "year", label: "Жил", caption: "Сүүлийн 12 сар" },
];
const fmt = (n: number) => n.toLocaleString("en-US");
/** Хэсгийн дотоод хуудас уу (/news/slug г.м.) — тэгвэл нэрийн хажууд бүтэн замыг саарлаар */
function isSubPage(path: string) {
  const parts = path.split("/").filter(Boolean);
  return (parts[0] === "en" ? parts.length - 1 : parts.length) > 1 && pageLabel(path) !== path;
}

export function VisitsPanel({ range, onRange, data, error }: {
  range: AnalyticsRange; onRange: (r: AnalyticsRange) => void; data: AnalyticsSummary | null; error: string;
}) {
  const caption = RANGES.find((r) => r.key === range)!.caption;
  const loading = !error && data?.range !== range;   // шинэ хугацааны өгөгдөл ирэх хүртэл хуучныг бүдгэрүүлж үзүүлнэ
  const topMax = Math.max(1, ...(data?.top_pages.map((p) => p.views) ?? []));

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="min-w-0 xl:col-span-2">{/* min-w-0: графикийн SVG өргөн grid-ийн баганыг тэлэхгүй (цонх жижгэрэхэд) */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-navy">Сайтын хандалт</h2>
            <p className="text-sm text-slate-500">{caption} — давхардаагүй зочин ба нийт хуудас үзэлт</p>
          </div>
          <div role="group" aria-label="Хугацаа" className="inline-flex rounded-xl bg-slate-100 p-1">
            {RANGES.map((r) => (
              <button key={r.key} type="button" aria-pressed={range === r.key} onClick={() => onRange(r.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${range === r.key ? "bg-white text-navy shadow-sm" : "text-slate-500 hover:text-navy"}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : !data ? (
          <div className="grid h-[340px] place-items-center"><Spinner /></div>
        ) : (
          <div className={`transition-opacity ${loading ? "opacity-50" : ""}`} aria-busy={loading}>
            <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
              <div>
                <dt className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><span className="h-2 w-2 rounded-full bg-[#1e3a8f]" />Зочин</dt>
                <dd className="text-2xl font-black tabular-nums text-navy">{fmt(data.total_visitors)}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><span className="h-2 w-2 rounded-full bg-[#e0a800]" />Хуудас үзэлт</dt>
                <dd className="text-2xl font-black tabular-nums text-navy">{fmt(data.total_views)}</dd>
              </div>
            </dl>
            <div className="-mx-2 mt-2"><VisitsChart points={data.points} /></div>
          </div>
        )}
      </Card>

      <Card className="min-w-0">
        <h2 className="font-bold text-navy">Их үзсэн хуудас</h2>
        <p className="text-sm text-slate-500">{caption}</p>
        {!data ? (
          !error && <div className="grid h-40 place-items-center"><Spinner /></div>
        ) : data.top_pages.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">Энэ хугацаанд хандалт бүртгэгдээгүй байна. Тоолол сайт нийтлэгдсэнээс хойш эхэлнэ.</p>
        ) : (
          <ol className={`mt-4 space-y-3 transition-opacity ${loading ? "opacity-50" : ""}`}>
            {data.top_pages.map((p) => (
              <li key={p.path}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-semibold text-slate-700" title={p.path}>
                    {pageLabel(p.path)}
                    {isSubPage(p.path) && <span className="ml-1.5 font-normal text-slate-400">{p.path}</span>}
                  </span>
                  <span className="shrink-0 font-bold tabular-nums text-navy">{fmt(p.views)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${(p.views / topMax) * 100}%` }} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
