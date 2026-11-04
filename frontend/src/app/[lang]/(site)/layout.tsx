/* Олон нийтийн хуудсуудын layout: fixed header (smoother-ийн гадна), SmoothScroll leaf ХАМГИЙН ЭХЭНД,
   дараа нь #smooth-wrapper > #smooth-content дотор хуудасны агуулга (main + хөл). Header-ийн өндрийг pt-16/lg:pt-20-оор нөхнө.
   Header-ийн "Олимпиад" хавтанд (зөвхөн монгол) сүүлийн олимпиадын оныг server дээр татаж дамжуулна (олимпиадын хуудастай ижил логик). */

import { SiteHeader } from "@/components/home/SiteHeader";
import { SmoothScroll } from "@/components/site/SmoothScroll";
import { Splash } from "@/components/site/Splash";
import { fetchOlympiadYears, latestYear } from "@/lib/olympiad-api";

export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const olympiadYear = latestYear(lang === "mn" ? await fetchOlympiadYears() : null);
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
