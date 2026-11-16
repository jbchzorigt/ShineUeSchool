"use client";

/* Cambridge IGCSE дүнгийн хувь жилээр — ApexCharts бүлэгласан давхар баганатай (stacked + group) график: он бүрт хоёр багана — Шинэ Үе
   (#00E396) ба дэлхий (#FF4560); багана бүрийн доод тод хэсэг A*–A, дээрх цайвар хэсэг A*–C хүртэл (баганын орой = A*–C хувь).
   Хэсэг бүр дээр хувь (дээд хэсэгт A*–C нийт), оноо ба он сайтын үндсэн цэнхэр өнгөөр (IB-ийн графиктай ижил). Тэнхлэг 0–100%.
   Client дээр dynamic import; unmount-д destroy; reduced motion үед анимацигүй. */

import { useEffect, useRef } from "react";
import type ApexCharts from "apexcharts";
import type { ApexOptions } from "apexcharts";
import type { ProgramGradeRate } from "@/lib/types";
import { esc, num } from "./theme";

const BLUE = "#1e3a8f", MUTED = "#4a5068", GRID = "#e4e9f5";
const SCHOOL = ["#00E396", "#8df2cf"], WORLD = ["#FF4560", "#ffb0bb"];   // [A*–A, A*–C хүртэлх дээд хэсэг]
const round1 = (v: number) => Math.round(v * 10) / 10;

export function GradeRatesChart({ rates, schoolName, worldName, ariaLabel }: { rates: ProgramGradeRate[]; schoolName: string; worldName: string; ariaLabel: string }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el || !rates.length) return;
    let chart: ApexCharts | null = null;
    let cancelled = false;
    (async () => {
      const { default: Apex } = await import("apexcharts");
      if (cancelled) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // Дээд хэсэг = A*–C − A*–A (давхарласан баганын орой A*–C-д хүрнэ); хаягт нийт A*–C-г харуулна
      const options: ApexOptions = {
        chart: { type: "bar", height: 340, stacked: true, fontFamily: "inherit", toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: !reduce, speed: 700 } },
        series: [
          { name: `${schoolName} · A*–A`, group: "school", data: rates.map((r) => r.school_a) },
          { name: `${schoolName} · A*–C`, group: "school", data: rates.map((r) => round1(r.school_c - r.school_a)) },
          { name: `${worldName} · A*–A`, group: "world", data: rates.map((r) => r.world_a) },
          { name: `${worldName} · A*–C`, group: "world", data: rates.map((r) => round1(r.world_c - r.world_a)) },
        ],
        colors: [SCHOOL[0], SCHOOL[1], WORLD[0], WORLD[1]],
        fill: { opacity: 1 },
        plotOptions: { bar: { columnWidth: rates.length > 5 ? "70%" : "56%", borderRadius: 6, borderRadiusApplication: "end", borderRadiusWhenStacked: "last" } },
        dataLabels: {
          enabled: true,
          formatter: (v, opts) => {
            const r = rates[opts?.dataPointIndex ?? -1];
            if (!r) return "";
            const total = [r.school_a, r.school_c, r.world_a, r.world_c][opts?.seriesIndex ?? 0];
            return `${num(total)}%`;
          },
          style: { fontSize: "11px", fontWeight: 700, colors: [BLUE] },
        },
        stroke: { show: true, width: 2, colors: ["#ffffff"] },
        xaxis: { categories: rates.map((r) => String(r.year)), labels: { style: { colors: BLUE, fontWeight: 700, fontSize: "13px" } }, axisBorder: { color: GRID }, axisTicks: { show: false } },
        yaxis: { min: 0, max: 100, tickAmount: 4, labels: { formatter: (v) => `${Math.round(v)}%`, style: { colors: MUTED } } },
        grid: { borderColor: GRID, strokeDashArray: 4, padding: { top: 4, right: 8, left: 4 } },
        legend: { show: true, position: "top", horizontalAlign: "left", fontSize: "13px", fontWeight: 600, labels: { colors: BLUE }, markers: { strokeWidth: 0 } },
        states: { hover: { filter: { type: "darken" } } },
        tooltip: {
          shared: true, intersect: false,
          custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
            const r = rates[dataPointIndex];
            if (!r) return "";
            const row = (label: string, color: string, a: number, c: number) =>
              `<div class="flex justify-between gap-6"><span><span style="color:${color}">●</span> ${esc(label)}</span><span>A*–A <b>${num(a)}%</b> · A*–C <b>${num(c)}%</b></span></div>`;
            return `<div class="rounded-lg bg-[#223A62] px-3 py-2 text-sm text-white shadow-lg"><div class="mb-1 font-semibold text-[#FFF457]">${r.year}</div>`
              + row(schoolName, SCHOOL[0], r.school_a, r.school_c) + row(worldName, WORLD[0], r.world_a, r.world_c) + `</div>`;
          },
        },
        responsive: [{ breakpoint: 640, options: { chart: { height: 290 }, dataLabels: { style: { fontSize: "9px" } }, plotOptions: { bar: { columnWidth: "84%" } }, legend: { fontSize: "11px" } } }],
      };
      const c = new Apex(el, options);
      chart = c;
      await c.render();
    })();
    return () => { cancelled = true; chart?.destroy(); };
  }, [rates, schoolName, worldName]);

  return <div ref={box} className="min-h-[290px] sm:min-h-[340px]" role="img" aria-label={ariaLabel} />;
}
