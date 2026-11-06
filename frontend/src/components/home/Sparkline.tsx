"use client";

/* Картын жижиг чиг хандлага — ApexCharts `area` sparkline (тэнхлэг, tooltip-гүй), сүүлийн цэг тодруулсан (dot — өөр өнгө, ж.нь алтан). Утгууд жилээр.
   Client дээр dynamic import; unmount-д destroy; reduced motion үед анимацигүй. */

import { useEffect, useRef } from "react";
import type ApexCharts from "apexcharts";
import type { ApexOptions } from "apexcharts";

export function Sparkline({ values, color, dot, ariaLabel }: { values: number[]; color: string; dot?: string; ariaLabel: string }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el || values.length < 2) return;
    let chart: ApexCharts | null = null;
    let cancelled = false;
    (async () => {
      const { default: Apex } = await import("apexcharts");
      if (cancelled) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const lo = Math.min(...values), hi = Math.max(...values), pad = (hi - lo || 1) * 0.15;
      const options: ApexOptions = {
        chart: { type: "area", height: 48, width: 128, sparkline: { enabled: true }, animations: { enabled: !reduce, speed: 600 } },
        series: [{ name: "", data: values }],
        colors: [color],
        stroke: { curve: "straight", width: 2.5 },
        fill: { type: "gradient", gradient: { shadeIntensity: 0, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 100] } },
        markers: { size: 0, discrete: [{ seriesIndex: 0, dataPointIndex: values.length - 1, fillColor: dot ?? color, strokeColor: color, size: 4.5 }] },
        yaxis: { min: Math.max(0, lo - pad), max: hi + pad },
        tooltip: { enabled: false },
        states: { hover: { filter: { type: "none" } } },
      };
      const c = new Apex(el, options);
      chart = c;
      await c.render();
    })();
    return () => { cancelled = true; chart?.destroy(); };
  }, [values, color, dot]);

  if (values.length < 2) return null;
  return <div ref={box} className="h-12 w-32 shrink-0" role="img" aria-label={ariaLabel} />;
}
