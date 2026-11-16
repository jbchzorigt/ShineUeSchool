/* Слотын дүүргэлт: "taken/capacity" тоо (эсвэл showLeft үед сул суудлын тоо "N/M сул") + MeterBar
   (≥100% улаан, ≥80% шар, бусад navy; дэлгэцэнд орж ирэхэд дүүрнэ) — бар үргэлж taken/capacity харьцаагаар дүүрнэ. */

import { MeterBar } from "@/components/site/MeterBar";

export function SlotBar({ taken, capacity, label, showLeft = false, className = "" }: { taken: number; capacity: number; label?: string; showLeft?: boolean; className?: string }) {
  return (
    <div className={`min-w-24 ${className}`}>
      <div className="text-sm">
        {showLeft ? (
          <><span className="font-semibold">{Math.max(capacity - taken, 0)}</span>/{capacity} сул</>
        ) : (
          <><span className="font-semibold">{taken}</span>/{capacity}</>
        )}
        {label && <span className="text-slate-500"> · {label}</span>}
      </div>
      <div className="mt-1"><MeterBar taken={taken} capacity={capacity} height="h-1.5" label="Слотын дүүргэлт" /></div>
    </div>
  );
}
