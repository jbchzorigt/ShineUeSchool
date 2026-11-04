/* Хаяг, байршил: газрын зураг (Google Maps embed) + хаяг, утас, и-мэйл, ажлын цаг. */

import { BrandIcon } from "@/components/site/BrandIcon";
import { CONTACT } from "@/lib/home-data";
import { getDict, type Lang } from "@/lib/i18n";

export function LocationSection({ lang = "mn" }: { lang?: Lang }) {
  const t = getDict(lang).home.location;
  return (
    <section id="location" className="mx-auto flex max-w-[1440px] scroll-mt-20 flex-col gap-5 border-t border-line px-4 pb-10 pt-10 lg:gap-10 md:px-10 lg:px-24 lg:pb-[72px] lg:pt-[72px]">
      <h2 className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">{t.title}</h2>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 overflow-hidden rounded-xl lg:col-span-7">
          {CONTACT.mapEmbedUrl[lang] ? (
            <iframe
              src={CONTACT.mapEmbedUrl[lang]}
              title={t.mapTitle}
              className="h-[200px] w-full border-0 lg:h-[300px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          ) : (
            /* ⚠ home-data.ts дахь CONTACT.mapEmbedUrl-д Google Maps embed холбоос тавина */
            <div role="img" aria-label={t.mapAria} className="relative grid h-[200px] w-full place-items-center bg-paper-3 text-sm text-muted lg:h-[300px]">
              <svg width="40" height="48" viewBox="0 0 24 30" aria-hidden="true" className="absolute left-1/2 top-1/2 -ml-5 -mt-11">
                <path d="M12 29s9-9.5 9-17A9 9 0 0 0 3 12c0 7.5 9 17 9 17z" fill="#1e3a8f" />
                <circle cx="12" cy="12" r="3.5" fill="#ffffff" />
              </svg>
              <span className="mt-10">{t.mapPlaceholder}</span>
            </div>
          )}
        </div>
        <address className="col-span-12 flex flex-col gap-4 not-italic lg:col-span-5 lg:gap-[18px] lg:pt-2">
          <Item label={t.address} icon={<BrandIcon name="google-maps" size={18} />}>
            <span className="font-display text-xl font-extrabold leading-snug lg:text-2xl">{t.addressValue}</span>
          </Item>
          <Item label={t.phone} icon={<PhoneIcon />}>
            <a href={`tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`} className="text-[17px] font-medium text-navy lg:text-lg">{CONTACT.phone}</a>
          </Item>
          <Item label={t.email} icon={<BrandIcon name="gmail" size={18} />}>
            <a href={`mailto:${CONTACT.email}`} className="text-[17px] font-medium text-navy lg:text-lg">{CONTACT.email}</a>
          </Item>
          <Item label={t.hours}>
            <span className="text-[17px] lg:text-lg">{t.hoursValue}</span>
          </Item>
          <a href={CONTACT.mapUrl} target="_blank" rel="noopener" className="mt-1 inline-flex items-center gap-2 self-start text-[17px] font-semibold text-navy underline decoration-2 underline-offset-[5px] hover:text-navy-deep">
            <BrandIcon name="google-maps" size={22} />
            {t.openMap}
          </a>
        </address>
      </div>
    </section>
  );
}

/** Утас: dashboard-icons-д ерөнхий утасны icon байхгүй тул энгийн inline SVG (navy). */
function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z" fill="#1e3a8f" />
    </svg>
  );
}

function Item({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-2 text-sm text-muted">{icon}{label}</span>
      {children}
    </div>
  );
}
