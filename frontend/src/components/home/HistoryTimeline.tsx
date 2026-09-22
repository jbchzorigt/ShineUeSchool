"use client";

/* =====================================================================
   Сургуулийн түүх: слайдер timeline (санаа: codepen.io/bcarvalho/pen/RZqmZX).
   - Он бүр бүтэн өргөнтэй, дэвсгэр зурагтай нэг слайд. Баруун талд нь харанхуй
     бүрхүүл, дээр нь он (шар), гарчиг, текст.
   - Десктопт баруун захад онуудын босоо жагсаалт (идэвхтэй он дээр цэг),
     дээр доор нь босоо сум. Утсан дээр сум зүүн/баруун талд, жагсаалт нуугдана.
   - Слайд солигдоход тууз гулсаж, дараа нь он → гарчиг → текст дараалан гарч ирнэ.
   - Гар: ← → товч; хуруу: зүүн/баруун шудрах.
   - prefers-reduced-motion: гулсалт, fade-гүй шууд солигдоно.
   ===================================================================== */

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { HISTORY } from "@/lib/home-data";

export function HistoryTimeline() {
  const [active, setActive] = useState(0);
  const count = HISTORY.length;
  const go = useCallback((i: number) => setActive(Math.max(0, Math.min(count - 1, i))), [count]);

  /* Гарын сум: зөвхөн slider дээр фокустай үед */
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); go(active + 1); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); go(active - 1); }
    }
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [active, go]);

  /* Хуруугаар шудрах */
  const touchX = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) { touchX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 50) go(active + (dx < 0 ? 1 : -1));
  }

  return (
    <section id="history" className="scroll-mt-20 border-t border-line">
      <div className="mx-auto flex max-w-[1440px] items-baseline justify-between px-4 pt-10 pb-6 md:px-10 lg:px-24 lg:pt-[72px] lg:pb-10">
        <h2 className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">Сургуулийн түүх</h2>
        <span className="text-sm text-muted tabular-nums" aria-live="polite">
          {active + 1} / {count}
        </span>
      </div>

      <div
        ref={root}
        tabIndex={0}
        role="region"
        aria-roledescription="слайдер"
        aria-label="Сургуулийн түүхийн үе шатууд"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative h-[560px] w-full overflow-hidden bg-navy-deep text-white shadow-[0_5px_25px_5px_rgba(0,0,0,0.2)] outline-none focus-visible:ring-4 focus-visible:ring-gold lg:h-[600px]"
      >
        {/* Слайдын тууз */}
        <div
          className="flex h-full transition-transform duration-[1200ms] ease-[cubic-bezier(0.68,-0.4,0.27,1.34)] motion-reduce:transition-none"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {HISTORY.map((e, i) => {
            const isActive = i === active;
            return (
              <div
                key={i}
                role="group"
                aria-roledescription="слайд"
                aria-label={`${e.year ?? "[он]"}: ${e.title}`}
                aria-hidden={!isActive}
                className="relative h-full w-full shrink-0 overflow-hidden"
              >
                {/* Дэвсгэр зураг эсвэл хөх дэвсгэр */}
                {e.image ? (
                  <Image src={e.image} alt="" fill sizes="100vw" className="object-cover" priority={i === 0} />
                ) : (
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,#1e3a8f_0%,#12245c_60%,#0b1740_100%)]" aria-hidden="true" />
                )}
                {/* Баруун талын харанхуй бүрхүүл (эх дизайны radial shadow) */}
                <div
                  aria-hidden="true"
                  className="absolute -bottom-[10%] -right-[115%] h-full w-full rounded-full bg-black/70 shadow-[-230px_0_150px_60vw_rgba(0,0,0,0.7)] lg:-bottom-[12%] lg:-right-[20%] lg:h-1/2 lg:w-60 lg:shadow-[-230px_0_150px_39vw_rgba(0,0,0,0.7)]"
                />

                {/* Агуулга: утсан дээр дээр төвд, десктопт баруун талд баруун зэрэгцүүлсэн */}
                <div className="absolute left-1/2 top-[13%] z-[2] w-4/5 max-w-[310px] -translate-x-1/2 text-center lg:left-auto lg:right-1/4 lg:top-1/2 lg:w-[360px] lg:max-w-none lg:translate-x-0 lg:-translate-y-1/2 lg:text-right">
                  <span className={`block font-display text-[42px] font-normal italic leading-none text-gold ${reveal(isActive, "delay-[1600ms]")} mb-12 lg:mb-2 lg:text-[32px]`}>
                    {e.year ?? "[он]"}
                  </span>
                  <h3 className={`font-display text-[34px] font-extrabold leading-tight ${reveal(isActive, "delay-[1700ms]")} mb-7 lg:mb-4 lg:text-[46px]`}>
                    {e.title}
                  </h3>
                  <p className={`text-[15px] leading-relaxed text-white/90 ${reveal(isActive, "delay-[1800ms]")}`}>{e.text}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Онуудын босоо жагсаалт (десктоп) */}
        <ol className="absolute right-[15%] top-0 z-[1] hidden h-full flex-col justify-center lg:flex" aria-label="Онууд">
          <span aria-hidden="true" className="absolute -left-[30px] top-0 h-full w-px bg-white/20" />
          {HISTORY.map((e, i) => (
            <li key={i} className="relative my-[15px]">
              <span
                aria-hidden="true"
                className={`absolute -left-[32.5px] top-2 h-1.5 w-1.5 rounded-full bg-gold transition-transform duration-200 ${i === active ? "scale-100" : "scale-0"}`}
              />
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={i === active ? "true" : undefined}
                aria-label={`${e.year ?? "[он]"}: ${e.title}`}
                className={`font-display text-lg italic transition-colors ${i === active ? "text-gold" : "text-gold/60 hover:text-gold"}`}
              >
                {e.year ?? "[он]"}
              </button>
            </li>
          ))}
        </ol>

        {/* Сумнууд: утсан дээр зүүн/баруун, десктопт жагсаалтын дээр/доор босоо */}
        <ArrowButton dir="prev" disabled={active === 0} onClick={() => go(active - 1)} />
        <ArrowButton dir="next" disabled={active === count - 1} onClick={() => go(active + 1)} />
      </div>
    </section>
  );
}

/* Идэвхтэй слайдын текст: баруунаас 20px гулсаж fade-ээр гарна (эх дизайны transition) */
function reveal(on: boolean, delay: string) {
  return on
    ? `opacity-100 translate-x-0 transition-all duration-[400ms] ${delay} motion-reduce:transition-none`
    : "opacity-0 translate-x-5 transition-all duration-200 delay-[400ms] motion-reduce:transition-none";
}

function ArrowButton({ dir, disabled, onClick }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  const pos =
    dir === "prev"
      ? "left-[8%] top-[15%] lg:left-auto lg:right-[15%] lg:top-[15%] lg:rotate-90 lg:translate-y-2.5"
      : "right-[8%] top-[15%] lg:top-auto lg:bottom-[15%] lg:right-[15%] lg:rotate-90 lg:translate-y-2.5";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "Өмнөх үе шат" : "Дараагийн үе шат"}
      className={`absolute z-[2] grid h-11 w-11 place-items-center text-gold transition-transform hover:scale-110 disabled:opacity-30 disabled:hover:scale-100 ${pos}`}
    >
      <svg width="16" height="26" viewBox="0 0 27 44" aria-hidden="true">
        {dir === "prev" ? (
          <path d="M0,22L22,0l2.1,2.1L4.2,22l19.9,19.9L22,44L0,22z" fill="currentColor" />
        ) : (
          <path d="M27,22L5,44l-2.1-2.1L22.8,22L2.9,2.1L5,0L27,22z" fill="currentColor" />
        )}
      </svg>
    </button>
  );
}
