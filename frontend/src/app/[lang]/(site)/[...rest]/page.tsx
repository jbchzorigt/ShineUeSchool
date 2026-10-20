/* Тохирох хуудасгүй зам (`/xyz`, `/en/xyz`): сайтын header/footer-тэй, хэлтэй 404 (`[lang]/not-found.tsx`) харуулна.
   Үүнгүй бол олон root layout-тай тул Next-ийн загваргүй анхдагч 404 гарна. */

import { notFound } from "next/navigation";

export default function CatchAll() {
  notFound();
}
