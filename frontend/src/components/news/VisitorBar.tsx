"use client";

/* Зочны нэвтрэлтийн мөр: ачаалж байх үед юу ч харуулахгүй (FB идэвхгүй мессежийг
   status ирэхээс өмнө анивчуулахгүйн тулд), дараа нь FB идэвхгүй бол тайлбар,
   нэвтрээгүй бол товч (+ алдаа байвал доор нь), нэвтэрсэн бол нэр/зураг + гарах. */

import Image from "next/image";
import { useVisitor } from "@/lib/visitor";

export function VisitorBar() {
  const { visitor, loading, fbEnabled, error, login, logout } = useVisitor();

  if (loading) return null;

  if (!fbEnabled) {
    return <p className="text-sm text-muted">Сэтгэгдэл бичих, лайк дарах нь Facebook холболт тохируулагдсаны дараа идэвхжинэ.</p>;
  }

  if (!visitor) {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <button
          type="button"
          onClick={login}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy/90"
        >
          Facebook-ээр нэвтрэх
        </button>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {visitor.avatar_url ? (
        <Image src={visitor.avatar_url} alt="" width={36} height={36} unoptimized className="h-9 w-9 rounded-full object-cover" />
      ) : (
        <span className="grid h-9 w-9 place-items-center rounded-full bg-paper-3 text-sm text-muted">{visitor.name.slice(0, 1)}</span>
      )}
      <span className="text-sm font-semibold text-ink">{visitor.name}</span>
      <button type="button" onClick={logout} className="text-sm font-medium text-navy hover:underline">
        Гарах
      </button>
    </div>
  );
}
