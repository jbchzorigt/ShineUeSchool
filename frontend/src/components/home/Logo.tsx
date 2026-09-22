/* Сургуулийн сүлд (бодит лого): public/logo-emblem.png — дугуй эмблем (ШИНЭ ҮЕ · СУРГУУЛЬ).
   Бүтэн лого (сүлд + цагаан үг) public/logo-full.png — бараан дэвсгэр дээр ашиглана. */

import Image from "next/image";

export function Logo({ className = "h-10 w-10" }: { className?: string }) {
  return <Image src="/logo-emblem.png" alt="" width={512} height={512} priority className={`${className} object-contain`} aria-hidden="true" />;
}
