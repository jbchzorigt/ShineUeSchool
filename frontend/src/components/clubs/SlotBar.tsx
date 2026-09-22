/* Слотын дүүргэлт: "taken/capacity" тоо (эсвэл showLeft үед сул суудлын тоо "N/M сул") + progress bar
   (≥100% улаан, ≥80% шар, бусад navy) — бар үргэлж taken/capacity харьцаагаар дүүрнэ. */

export function SlotBar({ taken, capacity, label, showLeft = false, className = "" }: { taken: number; capacity: number; label?: string; showLeft?: boolean; className?: string }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((taken / capacity) * 100)) : 0;
  const color = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-gold" : "bg-navy";
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
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={capacity} aria-valuenow={taken} aria-label="Слотын дүүргэлт">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
