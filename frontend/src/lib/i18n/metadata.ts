/* hreflang: хуудас бүрийн `generateMetadata`-д `alternates: alternates("/about")` — mn ↔ en холбоос, x-default = монгол.
   `langs` өгвөл зөвхөн тэдгээр хэлийг (ж: англигүй мэдээнд en-ийг) тавина. Харьцангуй зам → layout-ийн metadataBase-ээр бүтэн URL. */

import type { Metadata } from "next";
import { LANGS, localePath, type Lang } from "./paths";

export function alternates(path: string, lang: Lang, langs: Lang[] = LANGS): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of langs) languages[l] = localePath(l, path);
  if (langs.includes("mn")) languages["x-default"] = path;
  return { canonical: localePath(lang, path), languages };
}
