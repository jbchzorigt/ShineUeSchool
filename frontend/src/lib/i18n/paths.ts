/* Хэл ба замын цэвэр функцууд (импортгүй — proxy, client, `node --test` гурвуулаа ашиглана).
   Монгол хуудсууд угтваргүй (`/about`), англи нь `/en` угтвартай (`/en/about`). Дотооддоо бүх нийтийн хуудас
   `app/[lang]/(site)/…` дор байрлах тул proxy монгол замыг `/mn/…` руу rewrite хийнэ. */

export type Lang = "mn" | "en";
export const LANGS: Lang[] = ["mn", "en"];
export const isLang = (v: string): v is Lang => v === "mn" || v === "en";

/** Зөвхөн монголоор байх хуудсууд (угтвар): англи хувилбаргүй, `/en/…` → монгол руу шилжүүлнэ. */
export const MN_ONLY = ["/calendar", "/timetable", "/clubs", "/survey"];

const under = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);
const isMnOnly = (path: string) => MN_ONLY.some((p) => under(path, p));

/** Хэлгүй зам → тухайн хэлний зам: ("en", "/") → "/en", ("en", "/#programs") → "/en#programs", ("mn", p) → p. */
export function localePath(lang: Lang, path: string): string {
  if (lang === "mn") return path;
  if (path === "/") return "/en";
  if (path.startsWith("/#") || path.startsWith("/?")) return `/en${path.slice(1)}`;
  return `/en${path}`;
}

/** Хэрэглэгчийн харах зам → хэл + хэлгүй зам ("/en/news/x" → {en, "/news/x"}, "/news" → {mn, "/news"}). */
export function stripLang(pathname: string): { lang: Lang; path: string } {
  if (under(pathname, "/en")) return { lang: "en", path: pathname.slice(3) || "/" };
  return { lang: "mn", path: pathname };
}

/** Хэл солих товч: одоогийн хуудасны нөгөө хэлний хувилбар (+ query). Англигүй хуудаснаас EN → "/en". */
export function switchPath(pathname: string, search: string, target: Lang): string {
  const { path } = stripLang(pathname);
  if (target === "en" && isMnOnly(path)) return "/en";
  return localePath(target, path) + search;
}

export type ProxyAction = { kind: "next" } | { kind: "rewrite"; to: string } | { kind: "redirect"; to: string; status: 307 | 308 };

/** Proxy-ийн шийдвэр: /en… → хэвээр (англигүй хуудас бол 307 монгол руу); /mn… → 308 угтваргүй; бусад → rewrite /mn…. */
export function proxyAction(pathname: string, search: string): ProxyAction {
  if (under(pathname, "/en")) {
    const path = pathname.slice(3) || "/";
    return isMnOnly(path) ? { kind: "redirect", to: path + search, status: 307 } : { kind: "next" };
  }
  if (under(pathname, "/mn")) return { kind: "redirect", to: (pathname.slice(3) || "/") + search, status: 308 };
  return { kind: "rewrite", to: `/mn${pathname === "/" ? "" : pathname}${search}` };
}

/** Proxy хамаарах эсэх: админ, олимпиад, API, Next дотоод зам, статик файл (сүүлийн сегментэд цэг) — үгүй. */
export function shouldHandle(pathname: string): boolean {
  if (["/admin", "/olympiad", "/api", "/_next"].some((p) => under(pathname, p))) return false;
  const last = pathname.slice(pathname.lastIndexOf("/") + 1);
  return !last.includes(".");
}
