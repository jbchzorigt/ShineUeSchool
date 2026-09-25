/* Хаяг, байршил: газрын зураг (Google Maps embed) + хаяг, утас, и-мэйл, ажлын цаг. */

import { CONTACT } from "@/lib/home-data";

export function LocationSection() {
  return (
    <section id="location" className="mx-auto flex max-w-[1440px] scroll-mt-20 flex-col gap-5 border-t border-line px-4 pb-10 pt-10 lg:gap-10 md:px-10 lg:px-24 lg:pb-[72px] lg:pt-[72px]">
      <h2 className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">Хаяг, байршил</h2>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 overflow-hidden rounded-xl lg:col-span-7">
          {CONTACT.mapEmbedUrl ? (
            <iframe
              src={CONTACT.mapEmbedUrl}
              title="Сургуулийн байршил, газрын зураг"
              className="h-[200px] w-full border-0 lg:h-[300px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          ) : (
            /* ⚠ home-data.ts дахь CONTACT.mapEmbedUrl-д Google Maps embed холбоос тавина */
            <div role="img" aria-label="Газрын зураг" className="relative grid h-[200px] w-full place-items-center bg-paper-3 text-sm text-muted lg:h-[300px]">
              <svg width="40" height="48" viewBox="0 0 24 30" aria-hidden="true" className="absolute left-1/2 top-1/2 -ml-5 -mt-11">
                <path d="M12 29s9-9.5 9-17A9 9 0 0 0 3 12c0 7.5 9 17 9 17z" fill="#1e3a8f" />
                <circle cx="12" cy="12" r="3.5" fill="#ffffff" />
              </svg>
              <span className="mt-10">[Газрын зураг: Google Maps embed]</span>
            </div>
          )}
        </div>
        <address className="col-span-12 flex flex-col gap-4 not-italic lg:col-span-5 lg:gap-[18px] lg:pt-2">
          <Item label="Хаяг">
            <span className="font-display text-xl font-extrabold leading-snug lg:text-2xl">{CONTACT.address}</span>
          </Item>
          <Item label="Утас">
            <a href={`tel:${CONTACT.phone.replace(/[^\d+]/g, "")}`} className="text-[17px] font-medium text-navy lg:text-lg">{CONTACT.phone}</a>
          </Item>
          <Item label="И-мэйл">
            <a href={`mailto:${CONTACT.email}`} className="text-[17px] font-medium text-navy lg:text-lg">{CONTACT.email}</a>
          </Item>
          <Item label="Ажлын цаг">
            <span className="text-[17px] lg:text-lg">{CONTACT.hours}</span>
          </Item>
          <a href={CONTACT.mapUrl} target="_blank" rel="noopener" className="mt-1 self-start text-[17px] font-semibold text-navy underline decoration-2 underline-offset-[5px] hover:text-navy-deep">
            Google Maps дээр нээх
          </a>
        </address>
      </div>
    </section>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted">{label}</span>
      {children}
    </div>
  );
}
