/* Тохирох хуудасгүй зам (`/xyz`, `/en/xyz`): `[lang]/not-found.tsx`-ийг харуулна. (site)-ийн гадна байх учир нь тэнд
   loading.tsx хариуг шууд stream эхлүүлж, хөтөч/хайлтын системд HTTP 200 очдог; энд жинхэнэ 404 буцна. */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLang } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const t = getDict(isLang(lang) ? lang : "mn");
  return { title: t.meta.title(t.common.notFoundTitle) };
}

export default function CatchAll() {
  notFound();
}
