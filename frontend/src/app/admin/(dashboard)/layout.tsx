"use client";

/* Нэвтэрсэн хэрэглэгчид зориулсан layout: хажуугийн цэс + дээд мөр.
   Нэвтрээгүй бол /admin/login руу шилжүүлнэ. Цэсэнд зөвхөн харах эрхтэй хэсгүүд гарна; эрхгүй хэсгийн хуудсыг хаана,
   зөвхөн харах эрхтэй хэсэгт ReadOnlyProvider-оор хадгалах/устгах товчнуудыг идэвхгүй болгоно. */

import Image from "next/image";
import Link from "next/link";
import { BookOpenText, CalendarDays, Eye, GraduationCap, LayoutDashboard, Newspaper, School, Shapes, Trophy, Users, type LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { ReadOnlyProvider, Spinner } from "@/components/ui";
import { can, sectionOf, type Section } from "@/lib/permissions";

// Icon: lucide-react (нэг загвартай шугаман icon)
const NAV: { href: string; label: string; icon: LucideIcon; exact?: boolean; superuser?: boolean; section?: Section }[] = [
  { href: "/admin", label: "Нүүр", icon: LayoutDashboard },
  { href: "/admin/olympiad", label: "Олимпиад", icon: Trophy, section: "olympiad" },
  { href: "/admin/timetable", label: "Хичээлийн хуваарь", icon: CalendarDays, section: "timetable" },
  { href: "/admin/clubs", label: "Дугуйлан", icon: Shapes, section: "clubs" },
  { href: "/admin/about", label: "Бидний тухай", icon: School, section: "about" },
  { href: "/admin/programs", label: "Хөтөлбөр", icon: BookOpenText, section: "programs" },
  { href: "/admin/graduates", label: "Төгсөгч", icon: GraduationCap, section: "graduates" },
  { href: "/admin/news", label: "Мэдээ", icon: Newspaper, section: "news" },
  { href: "/admin/users", label: "Хэрэглэгчид", icon: Users, superuser: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => { if (!loading && !user) router.replace("/admin/login"); }, [loading, user, router]);

  if (loading || !user) {
    return <div className="grid min-h-screen place-items-center bg-slate-50"><Spinner className="h-8 w-8" /></div>;
  }

  const nav = NAV.filter((n) => (!n.superuser || user.is_superuser) && (!n.section || can(user, n.section)));
  const section = sectionOf(path);
  const denied = section !== null && !can(user, section);
  const readOnly = section !== null && !denied && !can(user, section, "edit");

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Хажуугийн цэс */}
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        {/* Сургуулийн бүтэн лого (public/logo-full.png, 483×143) + "Удирдлага" */}
        <Link href="/admin" className="flex flex-col items-start gap-1.5 px-5 py-5" aria-label="Шинэ Үе сургууль — удирдлагын нүүр">
          <Image src="/logo-full.png" alt="Шинэ Үе сургууль" width={483} height={143} priority className="h-11 w-auto" />
          <span className="pl-1 text-[10px] font-semibold tracking-widest text-slate-500">УДИРДЛАГА</span>
        </Link>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((n) => {
            const active = n.href === "/admin" || n.exact ? path === n.href : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-navy text-white" : "text-slate-700 hover:bg-navy/10"}`}>
                <n.icon size={18} strokeWidth={2} aria-hidden="true" className={`shrink-0 ${active ? "text-gold" : "text-navy"}`} />{n.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Дээд мөр */}
        <header className="flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 md:px-8">
          {/* Утсанд хажуугийн цэс нуугдана — сүлд лого (public/logo-emblem.png) */}
          <Link href="/admin" className="shrink-0 md:hidden" aria-label="Удирдлагын нүүр">
            <Image src="/logo-emblem.png" alt="Шинэ Үе сургууль" width={36} height={36} className="h-9 w-9" />
          </Link>
          <nav className="flex gap-2 overflow-x-auto md:hidden">
            {nav.map((n) => <Link key={n.href} href={n.href} className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-navy hover:bg-navy/10"><n.icon size={14} aria-hidden="true" />{n.label}</Link>)}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-slate-600">{user.full_name}</span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gold text-xs font-bold text-navy">{user.username.slice(0, 2).toUpperCase()}</span>
            <button onClick={() => { logout(); router.replace("/admin/login"); }} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Гарах</button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">
          {denied ? (
            <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Танд энэ хэсгийг харах эрх байхгүй. Эрх авахыг хүсвэл системийн админд хандана уу.</p>
          ) : (
            <ReadOnlyProvider value={readOnly}>
              {readOnly && (
                <p className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800">
                  <Eye size={16} aria-hidden="true" className="shrink-0" />Танд энэ хэсгийг зөвхөн харах эрх байна — хадгалах, устгах боломжгүй.
                </p>
              )}
              {children}
            </ReadOnlyProvider>
          )}
        </main>
      </div>
    </div>
  );
}
