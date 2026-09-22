"use client";

/* Мэдээний хэсгийн дэд цэс (табууд). Мэдээ бичих/засах хуудсанд "Мэдээ" таб идэвхтэй. */

import Link from "next/link";
import { usePathname } from "next/navigation";

const SUB = ["/admin/news/categories", "/admin/news/comments"];
const TABS = [
  { href: "/admin/news", label: "Мэдээ" },
  { href: "/admin/news/categories", label: "Ангилал" },
  { href: "/admin/news/comments", label: "Сэтгэгдэл" },
];

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="space-y-6">
      <nav aria-label="Мэдээний хэсгүүд" className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => {
          // "Мэдээ" нь жагсаалт + бичих/засах хуудсуудад идэвхтэй; бусад нь өөрийн замаар
          const active = t.href === "/admin/news" ? !SUB.some((s) => path.startsWith(s)) : path.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined}
                  className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${active ? "border-navy text-navy" : "border-transparent text-slate-600 hover:text-navy"}`}>
              {t.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
