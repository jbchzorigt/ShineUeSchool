/* Хөл хэсэг: нэр + хуудсуудын холбоос. */

import Link from "next/link";

// Хөлийн холбоосууд: зөвхөн тусдаа хуудсууд (анкор байхгүй), дээд цэстэй ижил дараалал
const LINKS = [
  { href: "/news", label: "Мэдээ" },
  { href: "/calendar", label: "Календарь, хуваарь" },
  { href: "/clubs", label: "Дугуйлан" },
  { href: "/olympiad", label: "Ү.Маамын нэрэмжит олимпиад" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-navy text-white">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-7 lg:min-h-[120px] lg:flex-row lg:items-center lg:justify-between md:px-10 lg:px-24 lg:py-9">
        <span className="font-display text-xl font-extrabold lg:text-[22px]">Шинэ Үе сургууль</span>
        <nav aria-label="Хуудсууд" className="flex flex-wrap gap-x-7 gap-y-2">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-[15px] text-white hover:underline hover:underline-offset-4">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
