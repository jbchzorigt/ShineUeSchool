"use client";

/* Оны Bauhaus хавтан (viewBox 1500×500, 3:1) — header-ийн "Олимпиад 2026" ба нүүрний hero товч хоёулаа ашиглана.
   Client дээр buildYear-ээр дүүргэнэ; unmount-д цэвэрлэнэ (StrictMode давхардал). idPrefix нь SVG id давхцахаас сэргийлнэ. */

import { useEffect, useRef } from "react";
import { buildYear } from "@/lib/yearTiles";

export function YearTiles({ year, idPrefix, className }: { year: number; idPrefix: string; className: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    buildYear(svg, String(year), idPrefix);
    return () => { svg.innerHTML = ""; };
  }, [year, idPrefix]);
  return <svg ref={ref} viewBox="0 0 1500 500" className={`shrink-0 overflow-visible ${className}`} aria-hidden="true" />;
}
