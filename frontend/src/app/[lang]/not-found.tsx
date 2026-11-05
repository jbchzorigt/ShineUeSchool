/* Нийтийн сайтын 404 (хэлээр): `[lang]/[...rest]` (олдохгүй зам) эсвэл хуудасны notFound().
   (site) layout-аас дээгүүр тул дээд цэс, хөлийг энд өөрөө зурна. Хэл нь client талд LangProvider-оос (not-found props авдаггүй). */

import { SiteFooter } from "@/components/home/SiteFooter";
import { SiteHeader } from "@/components/home/SiteHeader";
import { PageNotFound } from "@/components/site/PageNotFound";
import { fetchOlympiadYears, latestYear } from "@/lib/olympiad-api";

export default async function NotFound() {
  const olympiadYear = latestYear(await fetchOlympiadYears());
  return (
    <>
      <SiteHeader olympiadYear={olympiadYear} />
      <div className="flex min-h-screen flex-col pt-16 lg:pt-20">
        <PageNotFound />
        <SiteFooter />
      </div>
    </>
  );
}
