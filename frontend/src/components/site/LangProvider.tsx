"use client";

/* Нийтийн сайтын хэлний context: `[lang]/layout.tsx` server-ээс зөвхөн `lang` мөрийг дамжуулна (толь бичигт функц байдаг тул
   client тал өөрөө getDict-ээр авна). Client компонентууд useLang() / useDict() дуудна. */

import { createContext, useContext, type ReactNode } from "react";
import { getDict, type Dict, type Lang } from "@/lib/i18n";

const LangContext = createContext<Lang>("mn");

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export const useLang = (): Lang => useContext(LangContext);
export const useDict = (): Dict => getDict(useContext(LangContext));
