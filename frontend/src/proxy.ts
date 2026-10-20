/* Хэлний замчлал (Next 16 proxy = middleware): монгол хуудсууд угтваргүй URL-тэй боловч дотооддоо `app/[lang]/…`-ийн
   `/mn/…` руу rewrite; `/en/…` шууд; `/mn/…` → 308 угтваргүй; англигүй хуудас `/en/calendar` г.м. → 307 монгол руу.
   Шийдвэрийн логик lib/i18n/paths.ts (тесттэй). Админ, олимпиад, API, статик файл хамаарахгүй. */

import { NextResponse, type NextRequest } from "next/server";
import { proxyAction, shouldHandle } from "@/lib/i18n/paths";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!shouldHandle(pathname)) return NextResponse.next();
  const action = proxyAction(pathname, search);
  if (action.kind === "rewrite") return NextResponse.rewrite(new URL(action.to, request.url));
  if (action.kind === "redirect") return NextResponse.redirect(new URL(action.to, request.url), action.status);
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|api/|admin|olympiad|.*\\..*).*)"],
};
