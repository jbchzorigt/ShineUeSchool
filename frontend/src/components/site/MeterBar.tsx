"use client";

/* Дүүргэлтийн бар (дугуйлангийн слот): дэлгэцэнд орж ирэхэд 0-ээс дүүрнэ (CSS transition, IntersectionObserver), градиент өнгө —
   ≥100% улаан, ≥80% шар, бусад navy; дүүрээгүй бол хөдөлгөөнт судал (globals.css .meter-stripes). Reduced motion үед шууд, судал хөдлөхгүй. */

import { useEffect, useRef, useState } from "react";

const TONE = { full: "from-red-600 to-red-400", high: "from-[#e0a800] to-gold", ok: "from-navy to-[#3b5bdb]" };

export function MeterBar({ taken, capacity, label, height = "h-2" }: { taken: number; capacity: number; label: string; height?: string }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((taken / capacity) * 100)) : 0;
  const tone = pct >= 100 ? TONE.full : pct >= 80 ? TONE.high : TONE.ok;
  const box = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { setShown(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={box} className={`${height} w-full overflow-hidden rounded-full bg-slate-200`} role="progressbar" aria-valuemin={0} aria-valuemax={capacity} aria-valuenow={taken} aria-label={label}>
      <div className={`relative h-full overflow-hidden rounded-full bg-gradient-to-r ${tone} transition-[width] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none`}
           style={{ width: shown ? `${pct}%` : "0%" }}>
        {pct > 0 && pct < 100 && <span aria-hidden="true" className="meter-stripes absolute inset-0" />}
      </div>
    </div>
  );
}
