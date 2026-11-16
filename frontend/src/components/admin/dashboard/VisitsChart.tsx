"use client";

/* Сайтын хандалтын график (админ нүүр) — ApexCharts area: зочин (navy) ба хуудас үзэлт (алтан), 7 хоног/сар — өдрөөр, жил — сараар.
   Client дээр dynamic import; өгөгдөл солигдоход дахин зурна; unmount-д destroy. */

import { useEffect, useRef } from "react";
import type ApexCharts from "apexcharts";
import type { ApexOptions } from "apexcharts";
import type { AnalyticsPoint } from "@/lib/types";

export function VisitsChart({ points }: { points: AnalyticsPoint[] }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let chart: ApexCharts | null = null;
    let cancelled = false;
    (async () => {
      const { default: Apex } = await import("apexcharts");
      if (cancelled) return;
      const options: ApexOptions = {
        chart: { type: "area", height: 300, fontFamily: "inherit", toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: true, speed: 500 } },
        series: [{ name: "Зочин", data: points.map((p) => p.visitors) }, { name: "Хуудас үзэлт", data: points.map((p) => p.views) }],
        colors: ["#1e3a8f", "#e0a800"],
        stroke: { curve: "smooth", width: [3, 2] },
        fill: { type: "gradient", gradient: { shadeIntensity: 0, opacityFrom: 0.32, opacityTo: 0.02, stops: [0, 100] } },
        dataLabels: { enabled: false },
        markers: { size: points.length <= 12 ? 4 : 0, strokeColors: "#fff", strokeWidth: 2, hover: { size: 6 } },
        xaxis: { categories: points.map((p) => p.label), labels: { rotate: 0, hideOverlappingLabels: true, style: { colors: "#64748b", fontSize: "11px" } }, axisBorder: { show: false }, axisTicks: { show: false }, tooltip: { enabled: false } },
        yaxis: { min: 0, forceNiceScale: true, labels: { formatter: (v) => String(Math.round(v)), style: { colors: "#64748b" } } },
        grid: { borderColor: "#e2e8f0", strokeDashArray: 4 },
        legend: { show: false },   // тайлбарыг VisitsPanel-ийн нийт дүнгийн мөр (өнгөт цэгтэй) гүйцэтгэнэ
        tooltip: { shared: true, intersect: false, x: { formatter: (_v, o) => points[o?.dataPointIndex ?? 0]?.date ?? "" } },
        noData: { text: "Хандалт хараахан бүртгэгдээгүй" },
        responsive: points.length > 12 ? [{ breakpoint: 640, options: { xaxis: { tickAmount: 6 } } }] : [],   // гар утсанд 30 өдрийн огноо шахцалдахгүй
      };
      const c = new Apex(el, options);
      chart = c;
      await c.render();
    })();
    return () => { cancelled = true; chart?.destroy(); };
  }, [points]);

  return <div ref={box} className="min-h-[300px]" role="img" aria-label={`Сайтын хандалт: ${points.map((p) => `${p.label} — ${p.visitors} зочин, ${p.views} үзэлт`).join("; ")}`} />;
}
