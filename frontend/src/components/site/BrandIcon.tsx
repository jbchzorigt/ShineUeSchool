/* Брэнд icon (Google Maps, Gmail, Facebook …): public/icons/brands/<name>.svg.
   Эх сурвалж: https://github.com/homarr-labs/dashboard-icons (Apache-2.0); лого бүр тухайн компанийн барааны тэмдэг.
   Шинэ icon нэмэх: repo-ийн svg/<name>.svg-г public/icons/brands/ руу хуулж, Brand төрөлд нэрийг нэмнэ. */

import Image from "next/image";

export type Brand = "google-maps" | "gmail" | "facebook";

export function BrandIcon({ name, size = 20, className = "" }: { name: Brand; size?: number; className?: string }) {
  return <Image src={`/icons/brands/${name}.svg`} alt="" width={size} height={size} unoptimized aria-hidden="true" className={`shrink-0 ${className}`} />;
}
