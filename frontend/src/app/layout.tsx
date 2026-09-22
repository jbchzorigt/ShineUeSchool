import type { Metadata } from "next";
import { Piazzolla, Golos_Text, Geist_Mono } from "next/font/google";
import { VisitorProvider } from "@/lib/visitor";
import "./globals.css";

/* Гарчиг: Piazzolla (кирилл дэмжинэ, variable font — жин 400–800, optical size).
   Бие: Golos Text (кирилл дэмжинэ). */
const display = Piazzolla({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  axes: ["opsz"],
  display: "swap",
});
const body = Golos_Text({
  variable: "--font-body",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Шинэ Үе сургууль",
  description: "Шинэ Үе сургуулийн албан ёсны вэб сайт: мэдээ, Ү.Маамын нэрэмжит математикийн олимпиад, сургуулийн түүх, хаяг.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <VisitorProvider>{children}</VisitorProvider>
      </body>
    </html>
  );
}
