"use client";

/* Хөтөлбөрийн онооны график — ApexCharts SLOPE chart (multi-group демо): багана бүр цуврал (он), шугам бүр хичээл, цэг бүр дээр
   хичээлийн нэр; оноо жилээс жилд хэрхэн өөрчлөгдсөнийг налуугаар харуулна (ЭЕШ-ийн оноо г.м.). Өгөгдөл админаас
   (ProgramDetail.radar: subjects × series). Палитр ScholarshipChart-тай ижил. ApexCharts window хэрэглэдэг тул client дээр
   dynamic import; unmount-д destroy; reduced motion үед анимацигүй. */

import { useEffect, useRef } from "react";
import type ApexCharts from "apexcharts";
import type { ApexOptions } from "apexcharts";
import type { ProgramRadar as RadarData } from "@/lib/types";

const P = { blue: "#223A62", green: "#2EC23C", yellow: "#FFF457", orange: "#FFAB1A", red: "#D1460A", maroon: "#980B01", black: "#000000", white: "#FFFFFF" };
// 12 хүртэлх хичээлд давхардалгүй өнгө: палитрын 6 өнгө + тэдгээрийн цайвар/бараан тон
const SERIES_COLORS = [P.blue, P.green, P.orange, P.red, P.maroon, P.black, "#5A7FC0", "#1F8A2B", "#B8760A", "#F08A6A", "#C2443A", "#6B6B6B"];

export function ProgramRadar({ radar }: { radar: RadarData }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el || radar.subjects.length < 3 || !radar.series.length) return;
    let chart: ApexCharts | null = null;
    let cancelled = false;
    (async () => {
      const { default: Apex } = await import("apexcharts");
      if (cancelled) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const all = radar.series.flatMap((s) => s.values);
      const lo = Math.min(...all), hi = Math.max(...all);
      const pad = Math.max(10, (hi - lo) * 0.15);
      const options: ApexOptions = {
        chart: { type: "line", height: 520, fontFamily: "inherit", background: P.white, toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: !reduce, speed: 900 }, dropShadow: { enabled: false } },
        // slope chart: цуврал = хичээл, x = он (багана)
        series: radar.subjects.map((sub, i) => ({ name: sub, data: radar.series.map((sr) => ({ x: sr.name, y: sr.values[i] ?? 0 })) })),
        colors: radar.subjects.map((_, i) => SERIES_COLORS[i % SERIES_COLORS.length]),
        plotOptions: { line: { isSlopeChart: true } },
        stroke: { width: 2.5, curve: "straight" },
        markers: { size: 5, strokeWidth: 2, strokeColors: P.white, hover: { size: 7 } },
        dataLabels: {
          enabled: true,
          formatter: (val, opts) => { const name = radar.subjects[opts?.seriesIndex ?? -1] ?? ""; return val === null ? "" : `${name} ${val}`; },
          // ApexCharts: style.colors = хайрцгийн дэвсгэр, background.foreColor = бичгийн өнгө
          style: { fontSize: "11px", fontWeight: 700, colors: [P.white] },
          background: { enabled: true, foreColor: P.black, borderColor: "rgba(0,0,0,0.25)", borderRadius: 4, padding: 4, opacity: 1, dropShadow: { enabled: false } },
        },
        xaxis: { position: "bottom", labels: { style: { colors: P.black, fontSize: "13px", fontWeight: 700 } }, axisBorder: { color: P.black }, axisTicks: { show: false } },
        yaxis: { min: Math.max(0, Math.floor((lo - pad) / 10) * 10), max: Math.ceil((hi + pad) / 10) * 10, show: true, tickAmount: 5, labels: { style: { colors: P.black }, formatter: (v) => String(Math.round(v)) } },
        grid: { borderColor: "rgba(0,0,0,0.12)", strokeDashArray: 3, padding: { left: 24, right: 24 } },
        legend: { show: true, position: "top", horizontalAlign: "left", fontSize: "13px", fontWeight: 600, labels: { colors: P.black }, markers: { strokeWidth: 0 } },
        tooltip: {
          shared: true, intersect: false, followCursor: true,
          custom: ({ series, dataPointIndex }) => {
            const rows = radar.subjects.map((sub, i) => `<div class="flex justify-between gap-4"><span>${sub}</span><b>${series[i]?.[dataPointIndex] ?? ""}</b></div>`).join("");
            return `<div class="rounded-lg bg-[#223A62] px-3 py-2 text-sm text-white shadow-lg"><div class="mb-1 font-semibold text-[#FFF457]">${radar.series[dataPointIndex]?.name ?? ""}</div>${rows}</div>`;
          },
        },
        responsive: [{ breakpoint: 640, options: { chart: { height: 440 }, dataLabels: { style: { fontSize: "10px" } }, legend: { fontSize: "11px" } } }],
      };
      const c = new Apex(el, options);
      chart = c;
      await c.render();
    })();
    return () => { cancelled = true; chart?.destroy(); };
  }, [radar]);

  return (
    <section aria-labelledby="radar-title" className="flex flex-col gap-4">
      <h2 id="radar-title" className="font-display text-[26px] font-extrabold text-navy lg:text-[32px]">{radar.title || "ЭЕШ-ийн оноо"}</h2>
      <figure className="scholarship-chart max-w-4xl rounded-2xl border border-line bg-white p-4 lg:p-6">
        <div ref={box} className="min-h-[440px] sm:min-h-[520px]" role="img" aria-label={`${radar.title || "ЭЕШ-ийн оноо"}: ${radar.subjects.join(", ")} хичээлээр ${radar.series.map((s) => s.name).join(", ")} онуудын налуу график`} />
      </figure>
    </section>
  );
}
