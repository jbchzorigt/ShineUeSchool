"use client";

/* MN | EN хэл солих товч: одоогийн хуудасны нөгөө хэлний хувилбар руу (query хадгална — дарах үед window.location.search;
   useSearchParams хэрэглэхгүй тул Suspense хэрэггүй). Англигүй хуудаснаас (календарь г.м.) EN → /en.
   Мэдээний дэлгэрэнгүй зэрэг хуудас <LangAvailability languages={…} /> render хийж аль хэлүүд байгааг мэдэгдэнэ — байхгүй хэл
   рүү дарахад тухайн хэлний /news жагсаалт руу очно. (Хуудас header-ээс доор render хийгддэг тул context биш, жижиг store.) */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { LANGS, localePath, switchPath, type Lang } from "@/lib/i18n";
import { useDict, useLang } from "./LangProvider";

let available: Lang[] | null = null;   // null = бүх хэл
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const setAvailable = (v: Lang[] | null) => { available = v; listeners.forEach((fn) => fn()); };

/** Хуудас доторх тэмдэглэгээ: энэ хуудсанд байгаа хэлнүүд (unmount болоход бүх хэл рүү буцна). */
export function LangAvailability({ languages }: { languages: Lang[] }) {
  const key = languages.join(",");
  useEffect(() => {
    setAvailable(key ? (key.split(",") as Lang[]) : []);
    return () => setAvailable(null);
  }, [key]);
  return null;
}

export function LangSwitch({ className = "" }: { className?: string }) {
  const lang = useLang();
  const t = useDict();
  const path = usePathname();
  const router = useRouter();
  const avail = useSyncExternalStore(subscribe, () => available, () => null);

  const target = (l: Lang) => (avail && !avail.includes(l) ? localePath(l, "/news") : switchPath(path, "", l));
  return (
    <div role="group" aria-label={t.nav.language} className={`flex items-center rounded-full border border-line p-0.5 text-[13px] font-semibold ${className}`}>
      {LANGS.map((l) => (
        <Link
          key={l}
          href={target(l)}
          hrefLang={l}
          lang={l}
          aria-current={l === lang ? "true" : undefined}
          onClick={(e) => {
            if (l === lang) { e.preventDefault(); return; }
            if (avail && !avail.includes(l)) return;
            e.preventDefault();
            router.push(switchPath(path, window.location.search, l));
          }}
          className="rounded-full px-2.5 py-1 uppercase text-ink hover:text-navy aria-[current]:bg-navy aria-[current]:text-white"
        >
          {l}
        </Link>
      ))}
    </div>
  );
}
