/* Root layout-уудын (сайт `[lang]`, `admin`, `olympiad`) хуваалцсан фонт ба суурь metadata.
   Сайтын фонт: TT Norms Pro (TypeType, худалдааны лиценз) — бие 400/500/600, гарчиг 700/800.
   Файлууд app/fonts/*.woff2 (кирилл Ө/Ү дэмжинэ). --font-display, --font-body хоёулаа ижил фонт. */

import type { Metadata } from "next";
import { Caveat, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";

const ttNorms = localFont({
  variable: "--font-body",
  src: [
    { path: "./fonts/tt-norms-pro-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/tt-norms-pro-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/tt-norms-pro-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/tt-norms-pro-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/tt-norms-pro-800.woff2", weight: "800", style: "normal" },
  ],
  display: "swap",
});
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
/* Гар бичмэл фонт (нүүрний Ү.Маам багшийн ишлэл): Caveat — кирилл Ө/Ү (cyrillic-ext) дэмжинэ, үсэг тод танигдана */
const hand = Caveat({ variable: "--font-caveat", subsets: ["cyrillic", "cyrillic-ext", "latin"], weight: ["500", "600"], display: "swap" });

/** <html className>-д: фонтын CSS хувьсагчууд + суурь класс */
export const htmlClass = `${ttNorms.variable} ${mono.variable} ${hand.variable} h-full antialiased`;
export const bodyClass = "min-h-full flex flex-col font-sans";

export const baseMetadata: Metadata = {
  title: "Шинэ Үе сургууль",
  description: "Шинэ Үе сургуулийн албан ёсны вэб сайт: мэдээ, Ү.Маамын нэрэмжит математикийн олимпиад, сургуулийн түүх, хаяг.",
};
