/* Сургуулийн сүлд (бодит лого): public/logo-emblem.png — дугуй эмблем (ШИНЭ ҮЕ · СУРГУУЛЬ).
   Бүтэн лого (сүлд + navy үг, цагаан дэвсгэрт) public/logo-full.png — header-т (SiteHeader.tsx). Favicon: src/app/icon.png, favicon.ico. */

import Image from "next/image";

export function Logo({ className = "h-10 w-10" }: { className?: string }) {
  return <Image src="/logo-emblem.png" alt="" width={512} height={512} priority className={`${className} object-contain`} aria-hidden="true" />;
}
