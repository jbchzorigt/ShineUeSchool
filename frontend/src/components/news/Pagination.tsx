/* Хуудаслалт: Өмнөх · 1 2 3 … N · Дараах. Холбоосыг дуудагч тал hrefFor-оор өгнө
   (/news эсвэл цаашид өөр жагсаалтын хуудсанд дахин ашиглаж болохоор). */

import Link from "next/link";

/* Одоогийн хуудасны эргэн тойрны цонх: 1, сүүлчийн хуудас, мөн page-1..page+1
   үргэлж харагдана; хоорондын цоорхойг "…"-ээр дүүргэнэ. */
function buildPageList(page: number, pages: number): (number | "…")[] {
  const keep = new Set<number>([1, pages, page - 1, page, page + 1]);
  const sorted = [...keep].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);
  const list: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) list.push("…");
    list.push(p);
    prev = p;
  }
  return list;
}

export function Pagination({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (p: number) => string }) {
  if (pages <= 1) return null;

  const list = buildPageList(page, pages);
  const base = "inline-flex h-11 min-w-11 items-center justify-center rounded-lg px-2.5 text-base font-medium";

  return (
    <nav aria-label="Мэдээний хуудаслалт" className="flex items-center justify-center gap-1 lg:gap-1.5">
      <Link href={hrefFor(Math.max(1, page - 1))} aria-label="Өмнөх хуудас" className={`${base} text-ink hover:bg-paper-3 hover:text-navy`}>
        <span className="hidden lg:inline">Өмнөх</span>
        <svg className="lg:hidden" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
      {list.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} aria-hidden="true" className={`${base} text-muted`}>
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={`${base} ${p === page ? "bg-navy text-white" : "text-ink hover:bg-paper-3 hover:text-navy"}`}
          >
            {p}
          </Link>
        ),
      )}
      <Link href={hrefFor(Math.min(pages, page + 1))} aria-label="Дараах хуудас" className={`${base} text-ink hover:bg-paper-3 hover:text-navy`}>
        <span className="hidden lg:inline">Дараах</span>
        <svg className="lg:hidden" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </nav>
  );
}
