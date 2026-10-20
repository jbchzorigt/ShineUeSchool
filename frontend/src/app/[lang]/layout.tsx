/* Нийтийн сайтын root layout (`/` → дотооддоо `/mn`, `/en/…`; src/proxy.ts). <html lang> хэлээр; фонт fonts.ts-ээс.
   Админ (`app/admin/layout.tsx`) ба олимпиад (`app/olympiad/layout.tsx`) тусдаа root layout-тай. */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { LangProvider } from "@/components/site/LangProvider";
import { getDict, isLang, LANGS } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site-url";
import { VisitorProvider } from "@/lib/visitor";
import { bodyClass, htmlClass } from "../fonts";
import "../globals.css";

export const generateStaticParams = () => LANGS.map((lang) => ({ lang }));

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const t = getDict(isLang(lang) ? lang : "mn");
  // metadataBase: hreflang/canonical-ийн харьцангуй замыг бүтэн URL болгоно (lib/i18n/metadata.ts)
  return { metadataBase: new URL(SITE_URL), title: t.meta.siteName, description: t.meta.defaultDescription };
}

export default async function LangRootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <html lang={lang} className={htmlClass}>
      <body className={bodyClass}>
        {/* Splash-ийг энэ session-д аль хэдийн үзсэн бол render-ийн өмнө нуух (components/site/Splash.tsx) */}
        <Script id="splash-seen-check" strategy="beforeInteractive">{`try{if(sessionStorage.getItem('shineue.splash')==='1'&&!document.getElementById('splash-seen')){var s=document.createElement('style');s.id='splash-seen';s.textContent='.site-splash{display:none}';document.head.appendChild(s)}}catch(e){}`}</Script>
        <LangProvider lang={lang}>
          <VisitorProvider>{children}</VisitorProvider>
        </LangProvider>
      </body>
    </html>
  );
}
