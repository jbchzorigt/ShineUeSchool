/* 404-ийн нийтлэг загвар ("математикийн дэвтэр"): 4∅4 — голын тэгийг шар харандаагаар зурж хоосон олонлог болгосон.
   Dict-ээс хамааралгүй (текстийг props-оор авна), тул LangProvider-гүй админ, олимпиадын 404-д ч ашиглана. Анимаци: globals.css .nf-*. */

import Link from "next/link";

type Props = { title: string; text: string; note: string; action: { href: string; label: string } };

export function NotFoundView({ title, text, note, action }: Props) {
  return (
    <main className="paper-grid flex flex-1 items-center justify-center px-6 py-12 lg:py-16">
      <div className="flex w-full flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center">
          <div role="img" aria-label="404" className="flex font-display text-[clamp(7.5rem,27vw,13rem)] font-extrabold leading-[0.95] tracking-tight text-navy">
            <span>4</span>
            <span className="relative">
              0
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 h-full w-full overflow-visible">
                <path className="nf-slash" pathLength={1} d="M4 98C28 72 62 34 96 2" />
              </svg>
            </span>
            <span>4</span>
          </div>
          <div className="nf-note flex -rotate-2 flex-col items-center text-navy-deep">
            <svg width="26" height="30" viewBox="0 0 26 30" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 28C10 21 9 12 13 3" />
              <path d="M7 8l6-5 4 7" />
            </svg>
            <p className="mt-1 font-hand text-[24px] font-medium leading-none lg:text-[28px]">{note}</p>
          </div>
        </div>
        <div className="max-w-[30rem]">
          <h1 className="font-display text-[32px] font-extrabold leading-tight text-ink lg:text-[44px]">{title}</h1>
          <p className="mt-4 text-[17px] leading-relaxed text-muted">{text}</p>
          <Link href={action.href} className="mt-7 inline-flex items-center rounded-lg bg-navy px-5 py-3 text-[15px] font-semibold text-white hover:bg-navy-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy">
            {action.label}
          </Link>
        </div>
      </div>
    </main>
  );
}
