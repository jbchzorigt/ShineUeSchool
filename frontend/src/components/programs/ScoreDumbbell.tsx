"use client";

/* Хичээлийн дундаж оноо — ApexCharts `chart.type: "dumbbell"` (7.x): мөр бүр хичээл, хоёр цэг — эхний ба сүүлийн он (цуврал), холбогч
   шугам — зөрүү. Дунд оны цэг зурахгүй (Apex хамгийн бага/их цэгийг хаягладаг тул дунд он нь «сүүлийн» мэт харагдана) — tooltip-д бүх он.
   Хичээлүүд сүүлийн оны онооноос нь өндрөөс нам руу. Тухайн онд өгөгдөлгүй нүд (null) зүгээр л цэггүй.
   Өгөгдөл: ProgramDetail.radar (subjects × series). Tooltip: бүх оны оноо + өөрчлөлт. Өнгө: хөтөлбөрийн шкал (theme.ts).
   ApexCharts window хэрэглэдэг тул client дээр dynamic import; unmount-д destroy; reduced motion үед анимацигүй. */

import { useEffect, useRef } from "react";
import type ApexCharts from "apexcharts";
import type { ApexOptions } from "apexcharts";
import type { ProgramRadar } from "@/lib/types";
import { useDict } from "@/components/site/LangProvider";
import { niceRange, num, ramp, signed } from "./theme";

const INK = "#1d1d1f", MUTED = "#4a5068", GRID = "#e4e9f5";
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Хичээл бүрийн эхний ба сүүлийн бодит оноо */
function ends(values: (number | null)[]) {
  const real = values.filter((v): v is number => v !== null);
  return { first: real[0] ?? null, last: real[real.length - 1] ?? null, count: real.length };
}

export function ScoreDumbbell({ radar, scale }: { radar: ProgramRadar; scale: [string, string] }) {
  const t = useDict().programs;
  const box = useRef<HTMLDivElement>(null);
  const rows = radar.subjects.length;

  useEffect(() => {
    const el = box.current;
    if (!el || !radar.series.length) return;
    let chart: ApexCharts | null = null;
    let cancelled = false;
    (async () => {
      const { default: Apex } = await import("apexcharts");
      if (cancelled) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const bySubject = radar.subjects.map((name, i) => ({ name, values: radar.series.map((s) => s.values[i] ?? null) }));
      const sorted = [...bySubject].sort((a, b) => (ends(b.values).last ?? -1) - (ends(a.values).last ?? -1));
      const all = sorted.flatMap((s) => s.values).filter((v): v is number => v !== null);
      const range = niceRange(all, 0, all.every((v) => v <= 100) ? 100 : Infinity);
      const n = radar.series.length;
      const drawn = n > 1 ? [0, n - 1] : [0];                 // эхний ба сүүлийн он
      const colors = ramp(scale, n);

      const options: ApexOptions = {
        chart: { type: "dumbbell", height: 72 + rows * 42, fontFamily: "inherit", toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: !reduce, speed: 700 } },
        series: drawn.map((k) => ({ name: radar.series[k].name, data: sorted.map((sub) => ({ x: sub.name, y: sub.values[k] })) })),
        colors: drawn.map((k) => colors[k]),
        plotOptions: {
          bar: {
            horizontal: true, barHeight: 4,
            dumbbell: {
              connector: { opacity: 0.6 },
              // цайвар (эхний он) цэгийн өнгө цагаан дээр бүдэг тул хаяг: эхний он — саарал, сүүлийн он — тод өнгө
              dataLabels: { enabled: true, offset: 8, colorFromMarker: false, formatter: (v: number) => num(v), style: { fontSize: "12px", fontWeight: 700, colors: [MUTED, colors[n - 1]] } },
            },
          },
        },
        markers: { size: 7, strokeWidth: 2, strokeColors: "#ffffff", hover: { size: 8 } },
        xaxis: {
          min: range.min, max: range.max, tickAmount: range.ticks,
          labels: { formatter: (v: string) => num(Number(v)), style: { colors: MUTED, fontSize: "12px" } },
          axisBorder: { show: false }, axisTicks: { show: false },
        },
        yaxis: { labels: { maxWidth: 190, style: { colors: INK, fontSize: "13px", fontWeight: 600 } } },
        grid: { borderColor: GRID, strokeDashArray: 4, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } }, padding: { right: 24, left: 4 } },
        legend: { show: true, position: "top", horizontalAlign: "left", fontSize: "13px", fontWeight: 600, labels: { colors: INK }, markers: { strokeWidth: 0 } },
        tooltip: {
          custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
            const sub = sorted[dataPointIndex];
            if (!sub) return "";
            const lines = radar.series.map((s, k) => `<div class="flex justify-between gap-6"><span><span style="color:${colors[k]}">●</span> ${esc(s.name)}</span><b>${sub.values[k] === null ? "–" : num(sub.values[k]!)}</b></div>`).join("");
            const e = ends(sub.values);
            const change = e.count > 1 ? `<div class="mt-1 flex justify-between gap-6 border-t border-white/20 pt-1"><span>${esc(t.change)}</span><b class="text-[#FFF457]">${signed(e.last! - e.first!)}</b></div>` : "";
            return `<div class="rounded-lg bg-[#223A62] px-3 py-2 text-sm text-white shadow-lg"><div class="mb-1 font-semibold text-[#FFF457]">${esc(sub.name)}</div>${lines}${change}</div>`;
          },
        },
        responsive: [{ breakpoint: 640, options: { chart: { height: 64 + rows * 38 }, xaxis: { tickAmount: Math.max(2, Math.ceil(range.ticks / 2)) }, yaxis: { labels: { maxWidth: 110, style: { fontSize: "11px" } } }, plotOptions: { bar: { dumbbell: { dataLabels: { enabled: false } } } } } }],
      };
      const c = new Apex(el, options);
      chart = c;
      await c.render();
    })();
    return () => { cancelled = true; chart?.destroy(); };
  }, [radar, scale, rows, t]);

  const years = radar.series.map((s) => s.name).join(", ");
  return <div ref={box} style={{ minHeight: 64 + rows * 38 }} role="img" aria-label={t.scoresAria(radar.title || t.scoresTitle, rows, years)} />;
}
