"use client";

/* Шалгалтын дундаж оноо жилээр — ApexCharts баганан (bar) график: он бүрт хоёр багана — манай сургууль (#00E396 ногоон) ба дэлхийн дундаж
   (#FF4560 улаан), баганын орой дээр утга; оноо ба он сайтын үндсэн цэнхэр (navy) өнгөөр. Тэнхлэг 0–45 (IB дипломын дээд оноо) — багана 0-ээс эхэлж үнэн харьцаатай. Tooltip-д хоёр оноо + зөрүү.
   Client дээр dynamic import; unmount-д destroy; reduced motion үед анимацигүй. */

import { useEffect, useRef } from "react";
import type ApexCharts from "apexcharts";
import type { ApexOptions } from "apexcharts";
import type { ProgramExamScore } from "@/lib/types";
import { esc, num, signed } from "./theme";

const BLUE = "#1e3a8f", MUTED = "#4a5068", GRID = "#e4e9f5", SCHOOL = "#00E396", WORLD = "#FF4560", MAX = 45;

export function ExamScoresChart({ scores, schoolName, worldName, diffName, ariaLabel }: {
  scores: ProgramExamScore[]; schoolName: string; worldName: string; diffName: string; ariaLabel: string;
}) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el || !scores.length) return;
    let chart: ApexCharts | null = null;
    let cancelled = false;
    (async () => {
      const { default: Apex } = await import("apexcharts");
      if (cancelled) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const options: ApexOptions = {
        chart: { type: "bar", height: 320, fontFamily: "inherit", toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: !reduce, speed: 700 } },
        series: [{ name: schoolName, data: scores.map((s) => s.school) }, { name: worldName, data: scores.map((s) => s.world) }],
        colors: [SCHOOL, WORLD],
        fill: { opacity: 1 },
        plotOptions: { bar: { columnWidth: scores.length > 5 ? "72%" : "58%", borderRadius: 6, borderRadiusApplication: "end", dataLabels: { position: "top" } } },
        dataLabels: { enabled: true, offsetY: -20, formatter: (v) => num(Number(v)), style: { fontSize: "12px", fontWeight: 700, colors: [BLUE] } },
        stroke: { show: true, width: 3, colors: ["transparent"] },   // хоёр баганын хооронд зай
        xaxis: { categories: scores.map((s) => String(s.year)), labels: { style: { colors: BLUE, fontWeight: 700, fontSize: "13px" } }, axisBorder: { color: GRID }, axisTicks: { show: false } },
        yaxis: { min: 0, max: MAX, tickAmount: 3, labels: { formatter: (v) => String(Math.round(v)), style: { colors: MUTED } } },
        grid: { borderColor: GRID, strokeDashArray: 4, padding: { top: 4, right: 8, left: 4 } },
        legend: { show: true, position: "top", horizontalAlign: "left", fontSize: "13px", fontWeight: 600, labels: { colors: BLUE }, markers: { strokeWidth: 0 } },
        states: { hover: { filter: { type: "darken" } } },
        tooltip: {
          shared: true, intersect: false,
          custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
            const s = scores[dataPointIndex];
            if (!s) return "";
            const row = (label: string, color: string, v: string) => `<div class="flex justify-between gap-6"><span><span style="color:${color}">●</span> ${esc(label)}</span><b>${v}</b></div>`;
            return `<div class="rounded-lg bg-[#223A62] px-3 py-2 text-sm text-white shadow-lg"><div class="mb-1 font-semibold text-[#FFF457]">${s.year}</div>`
              + row(schoolName, SCHOOL, num(s.school)) + row(worldName, WORLD, num(s.world))
              + `<div class="mt-1 flex justify-between gap-6 border-t border-white/20 pt-1"><span>${esc(diffName)}</span><b class="text-[#FFF457]">${signed(s.school - s.world)}</b></div></div>`;
          },
        },
        responsive: [{ breakpoint: 640, options: { chart: { height: 270 }, dataLabels: { style: { fontSize: "10px" } }, plotOptions: { bar: { columnWidth: "80%" } } } }],
      };
      const c = new Apex(el, options);
      chart = c;
      await c.render();
    })();
    return () => { cancelled = true; chart?.destroy(); };
  }, [scores, schoolName, worldName, diffName]);

  return <div ref={box} className="min-h-[270px] sm:min-h-[320px]" role="img" aria-label={ariaLabel} />;
}
