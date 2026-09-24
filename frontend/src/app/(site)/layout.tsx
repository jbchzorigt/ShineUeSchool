/* Олон нийтийн хуудсуудын layout: fixed header (smoother-ийн гадна), SmoothScroll leaf ХАМГИЙН ЭХЭНД,
   дараа нь #smooth-wrapper > #smooth-content дотор хуудасны агуулга (main + хөл). Header-ийн өндрийг pt-16/lg:pt-20-оор нөхнө.
   Header-ийн "Олимпиад" хавтанд сүүлийн олимпиадын оныг server дээр татаж дамжуулна (олимпиадын хуудастай ижил логик). */

import { SiteHeader } from "@/components/home/SiteHeader";
import { SmoothScroll } from "@/components/site/SmoothScroll";
import { Splash } from "@/components/site/Splash";
import { fetchOlympiadYears, latestYear } from "@/lib/olympiad-api";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const olympiadYear = latestYear(await fetchOlympiadYears());
  return (
    <>
      <SmoothScroll />
      <Splash />
      <SiteHeader olympiadYear={olympiadYear} />
      <div id="smooth-wrapper">
        <div id="smooth-content" className="flex min-h-screen flex-col pt-16 lg:pt-20">{children}</div>
      </div>
    </>
  );
}
