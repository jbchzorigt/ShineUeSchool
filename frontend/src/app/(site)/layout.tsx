/* Олон нийтийн хуудсуудын layout: fixed header (smoother-ийн гадна), SmoothScroll leaf ХАМГИЙН ЭХЭНД,
   дараа нь #smooth-wrapper > #smooth-content дотор хуудасны агуулга (main + хөл). Header-ийн өндрийг pt-16/lg:pt-20-оор нөхнө. */

import { SiteHeader } from "@/components/home/SiteHeader";
import { SmoothScroll } from "@/components/site/SmoothScroll";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SmoothScroll />
      <SiteHeader />
      <div id="smooth-wrapper">
        <div id="smooth-content" className="flex min-h-screen flex-col pt-16 lg:pt-20">{children}</div>
      </div>
    </>
  );
}
