/* `/admin/…`-ийн тохирох хуудасгүй зам: `admin/not-found.tsx`. Үүнгүй бол `[lang]` замд (lang="admin") орж Next-ийн загваргүй 404 гарна. */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict } from "@/lib/i18n";

const t = getDict("mn");

export const metadata: Metadata = { title: t.meta.title(t.common.notFoundTitle) };

export default function CatchAll() {
  notFound();
}
