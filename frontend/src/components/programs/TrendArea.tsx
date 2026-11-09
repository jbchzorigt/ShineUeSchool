"use client";

/* Жилээрх чиг хандлага — ApexCharts `area`: нэг цуврал, цэг бүр дээр утга, сүүлийн цэгийг point annotation-оор тодруулна.
   Хэрэглээ: Cambridge-ийн нийт дундаж оноо (kind="score"), гадаадад элссэн төгсөгчдийн хуримтлагдсан тоо (kind="count", tooltip-д
   "2026 онд +40 · 40 / 63 төгсөгч"); kind="percent" — 0–100% тэнхлэг.
   Тэнхлэг 0-ээс эхэлнэ (area-ийн талбай үнэн харьцаатай). Client дээр dynamic import; unmount-д destroy; reduced motion үед анимацигүй. */

import { useEffect, useRef } from "react";
import type ApexCharts from "apexcharts";
import type { ApexOptions } from "apexcharts";
import { niceRange, num } from "./theme";

const INK = "#1d1d1f", MUTED = "#4a5068", GRID = "#e4e9f5";

export interface TrendPoint { label: string; value: number; detail?: string }

export function TrendArea({ points, color, kind, name, ariaLabel }: { points: TrendPoint[]; color: string; kind: "score" | "percent" | "count"; name: string; ariaLabel: string }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el || !points.length) return;
    let chart: ApexCharts | null = null;
    let cancelled = false;
    (async () => {
      const { default: Apex } = await import("apexcharts");
      if (cancelled) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const fmt = (v: number) => (kind === "percent" ? `${num(v)}%` : num(v));
      const values = points.map((p) => p.value);
      const max = kind === "count" ? niceRange([0, ...values]).max : values.every((v) => v <= 100) ? 100 : niceRange(values).max;
      const last = points[points.length - 1];

      const options: ApexOptions = {
        chart: { type: "area", height: 300, fontFamily: "inherit", toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: !reduce, speed: 800 } },
        series: [{ name, data: values }],
        colors: [color],
        stroke: { curve: "straight", width: 3 },
        fill: { type: "gradient", gradient: { shadeIntensity: 0, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 100] } },
        markers: { size: 5, strokeColors: "#ffffff", strokeWidth: 2, hover: { size: 7 } },
        dataLabels: {
          enabled: true, offsetY: -8, formatter: (v) => fmt(Number(v)),
          // ApexCharts: style.colors = хайрцгийн дэвсгэр, background.foreColor = бичгийн өнгө
          style: { fontSize: "12px", fontWeight: 700, colors: ["#ffffff"] },
          background: { enabled: true, foreColor: INK, borderColor: color, borderRadius: 4, padding: 4, opacity: 1, dropShadow: { enabled: false } },
        },
        xaxis: { categories: points.map((p) => p.label), tickPlacement: "between", labels: { style: { colors: INK, fontWeight: 700 } }, axisBorder: { color: INK }, axisTicks: { show: false }, tooltip: { enabled: false } },
        yaxis: { min: 0, max, tickAmount: 4, labels: { formatter: (v) => fmt(Math.round(v)), style: { colors: MUTED } } },
        grid: { borderColor: GRID, strokeDashArray: 4, padding: { top: 8, right: 20, left: 8 } },
        annotations: { points: [{ x: last.label, y: last.value, marker: { size: 8, fillColor: color, strokeColor: "#ffffff", strokeWidth: 3 } }] },
        tooltip: {
          custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
            const p = points[dataPointIndex];
            return p ? `<div class="rounded-lg bg-[#223A62] px-3 py-2 text-sm text-white shadow-lg"><div class="font-semibold text-[#FFF457]">${p.label}</div><div><b>${fmt(p.value)}</b>${p.detail ? ` · ${p.detail}` : ""}</div></div>` : "";
          },
        },
        responsive: [{ breakpoint: 640, options: { chart: { height: 260 }, dataLabels: { style: { fontSize: "11px" } } } }],
      };
      const c = new Apex(el, options);
      chart = c;
      await c.render();
    })();
    return () => { cancelled = true; chart?.destroy(); };
  }, [points, color, kind, name]);

  return <div ref={box} className="min-h-[260px] sm:min-h-[300px]" role="img" aria-label={ariaLabel} />;
}
