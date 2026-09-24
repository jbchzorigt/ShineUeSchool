"use client";

/* Тэтгэлгийн мөнгөн дүн жилээр — ApexCharts "line with annotations" (apexcharts.com демо) загвар:
   жил бүрийн нийт дүн хөх шугам + өнгөт цэг (ногоон/шар/улбар/улаан/бордоо ээлжлэн), цэг бүр дээр $ дүн; дундаж дүнг y тэнхлэгийн
   annotation (улбар тасархай шугам, шар хаяг), хамгийн их жилийг бордоо point annotation-оор тэмдэглэнэ. Tooltip-д сурагчийн тоо. ApexCharts window хэрэглэдэг тул client дээр
   dynamic import; unmount-д destroy. Өнгө: хэрэглэгчийн өгсөн палитр (P). Өгөгдөл: ProgramDetail.scholarships (year, amount_usd) → жилээр нэгтгэнэ. */

import { useEffect, useRef } from "react";
import type ApexCharts from "apexcharts";
import type { ApexOptions } from "apexcharts";
import type { Scholarship } from "@/lib/types";
import { formatUsd } from "./money";

/* Графикийн палитр (хэрэглэгчийн өгсөн): хөх шугам, цэгүүд ногоон→шар→улбар→улаан→бордоо ээлжлэн, хар бичиг, цагаан дэвсгэр */
const P = { blue: "#223A62", green: "#2EC23C", yellow: "#FFF457", orange: "#FFAB1A", red: "#D1460A", maroon: "#980B01", black: "#000000", white: "#FFFFFF" };
const POINT_COLORS = [P.green, P.yellow, P.orange, P.red, P.maroon];

/** Жилээр нэгтгэсэн дүн (он өсөхөөр) */
export function byYear(items: Scholarship[]) {
  const m = new Map<number, { total: number; count: number }>();
  for (const s of items) {
    const e = m.get(s.year) ?? { total: 0, count: 0 };
    e.total += s.amount_usd; e.count += 1;
    m.set(s.year, e);
  }
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([year, v]) => ({ year, ...v }));
}

export function ScholarshipChart({ items }: { items: Scholarship[] }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const rows = byYear(items);
    if (!rows.length) return;
    let chart: ApexCharts | null = null;
    let cancelled = false;

    (async () => {
      const { default: Apex } = await import("apexcharts");
      if (cancelled) return;
      const years = rows.map((r) => String(r.year));
      const totals = rows.map((r) => r.total);
      const avg = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
      const maxI = totals.indexOf(Math.max(...totals));
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const options: ApexOptions = {
        chart: {
          type: "line", height: 320, fontFamily: "inherit", background: P.white, toolbar: { show: false }, zoom: { enabled: false },
          animations: { enabled: !reduce, speed: 900 },
        },
        series: [{ name: "Тэтгэлэг", data: totals }],
        colors: [P.blue],
        fill: { type: "solid", opacity: 1 },   // шугам бүтэн тод (анхдагч 0.85 тунгалаг)
        stroke: { curve: "straight", width: 3 },
        markers: {
          size: 7, strokeColors: P.blue, strokeWidth: 2, hover: { size: 9 },
          discrete: totals.map((_, i) => ({ seriesIndex: 0, dataPointIndex: i, fillColor: POINT_COLORS[i % POINT_COLORS.length], strokeColor: P.blue, size: 7 })),
        },
        dataLabels: {
          enabled: true, offsetY: -14,
          formatter: (v) => formatUsd(Number(v)),
          // ApexCharts: style.colors = хайрцгийн дэвсгэр, background.foreColor = бичгийн өнгө → цагаан хайрцаг, хар бичиг
          style: { fontSize: "12px", fontWeight: 700, colors: [P.white] },
          background: { enabled: true, foreColor: P.black, borderColor: P.blue, borderRadius: 4, padding: 5, opacity: 1, dropShadow: { enabled: false } },
        },
        grid: { borderColor: "rgba(0,0,0,0.12)", strokeDashArray: 3, padding: { top: 16, right: 24, left: 8 } },
        xaxis: { categories: years, axisBorder: { color: P.black }, axisTicks: { color: P.black }, labels: { style: { colors: P.black, fontWeight: 700 } } },
        yaxis: { min: 0, labels: { style: { colors: P.black }, formatter: (v) => formatUsd(Math.round(v)) }, tickAmount: 4 },
        tooltip: {
          // Apex-ийн саарал tooltip-ийн оронд хөх карт (гадна хүрээг .scholarship-chart CSS-ээр арилгана, globals.css)
          custom: ({ dataPointIndex }) => {
            const r = rows[dataPointIndex];
            return r ? `<div class="rounded-lg bg-[#223A62] px-3 py-2 text-sm text-white shadow-lg"><div class="font-semibold text-[#FFF457]">${r.year} он</div><div>${formatUsd(r.total)} · ${r.count} сурагч</div></div>` : "";
          },
        },
        annotations: {
          yaxis: [{
            y: avg, borderColor: P.orange, strokeDashArray: 6,
            label: { position: "right", textAnchor: "end", offsetX: -4, offsetY: 20, borderColor: P.orange, style: { color: P.black, background: P.yellow, fontWeight: 700 }, text: `Дундаж ${formatUsd(avg)}` },
          }],
          points: [{
            x: years[maxI], y: totals[maxI], marker: { size: 10, fillColor: P.yellow, strokeColor: P.maroon, strokeWidth: 3 },
            label: { offsetY: -4, borderColor: P.maroon, style: { color: P.white, background: P.maroon, fontWeight: 700 }, text: "Хамгийн их" },
          }],
        },
        responsive: [{ breakpoint: 640, options: { chart: { height: 260 }, dataLabels: { style: { fontSize: "11px" } }, yaxis: { labels: { formatter: (v: number) => `$${Math.round(v / 1000)}k` } } } }],
      };
      const c = new Apex(el, options);
      chart = c;
      await c.render();
    })();

    return () => { cancelled = true; chart?.destroy(); };
  }, [items]);

  return (
    <figure className="scholarship-chart rounded-2xl border border-line bg-white p-4 lg:p-6">
      <figcaption className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">Тэтгэлгийн дүн, жилээр</figcaption>
      <div ref={box} className="min-h-[260px] sm:min-h-[320px]" role="img" aria-label="Тэтгэлгийн нийт дүн жил бүрээр, шугаман график" />
    </figure>
  );
}
