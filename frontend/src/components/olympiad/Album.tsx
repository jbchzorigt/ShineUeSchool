"use client";

/* Дурсамжийн албум (album.js): зураг солигдоход тайлбар SplitText-ээр үг үгээр гарч ирнэ; Ken Burns маягийн шилжилт;
   6 сек тутам автомат, hover/focus-д зогсоно; өмнөх/дараах, цэгүүд, доод progress зураас, гарын сум. */

import { useRef } from "react";
import type { AlbumPhoto } from "@/lib/types";
import { gsap, SplitText, reduceMotion, useGSAP } from "./gsap";
import { Heading } from "./Heading";

const AUTOPLAY = 6;
const captionOf = (p: AlbumPhoto) => (p.caption ? `${p.title}. ${p.caption}` : p.title);

export function Album({ photos }: { photos: AlbumPhoto[] | null }) {
  const root = useRef<HTMLElement>(null);
  const list = photos ?? [];

  useGSAP(() => {
    const el = root.current;
    if (!el) return; // зураг байхгүй үед секц render хийгдэхгүй тул root холбогдоогүй
    const stage = el.querySelector<HTMLElement>("#album-stage")!;
    const caption = el.querySelector<HTMLElement>("#album-caption")!;
    const bar = el.querySelector<HTMLElement>("#album-bar")!;
    const album = el.querySelector<HTMLElement>(".album")!;
    const slides = gsap.utils.toArray<HTMLElement>(".slide", stage);
    const dots = gsap.utils.toArray<HTMLButtonElement>(".album-dots button", el);
    if (!slides.length) return;
    const reduce = reduceMotion();
    let index = 0, split: SplitText | null = null, busy = false, progress: gsap.core.Tween | null = null;
    let lastTl: gsap.core.Timeline | null = null;

    gsap.set(slides, { autoAlpha: 0, xPercent: 0, scale: 1 });
    gsap.set(slides[0], { autoAlpha: 1 });
    slides[0].classList.add("is-active");
    dots[0]?.classList.add("is-active");
    dots[0]?.setAttribute("aria-selected", "true");

    function showCaption(text: string) {
      if (split) { split.revert(); split = null; }
      caption.textContent = text;
      if (reduce) return;
      split = SplitText.create(caption, { type: "words", wordsClass: "w" });
      gsap.from(split.words, { autoAlpha: 0, y: 14, duration: 0.5, ease: "power2.out", stagger: 0.045 });
    }
    function startProgress() {
      if (progress) progress.kill();
      if (reduce) return;
      progress = gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, transformOrigin: "left center", duration: AUTOPLAY, ease: "none", onComplete: () => go(index + 1, 1) });
    }
    function go(to: number, dir?: number) {
      const next = gsap.utils.wrap(0, slides.length, to);
      if (next === index || busy) return;
      dir = dir || (next > index ? 1 : -1);
      busy = true;
      const cur = slides[index], nxt = slides[next];
      index = next;
      dots.forEach((d, i) => { const on = i === index; d.classList.toggle("is-active", on); d.setAttribute("aria-selected", String(on)); });
      cur.classList.remove("is-active"); nxt.classList.add("is-active");
      const tl = gsap.timeline({ defaults: { duration: reduce ? 0 : 0.9, ease: "power3.inOut" }, onComplete: () => { busy = false; startProgress(); } });
      lastTl = tl;
      tl.to(cur, { autoAlpha: 0, xPercent: -10 * dir, scale: 1.04 }, 0)
        .fromTo(nxt, { autoAlpha: 0, xPercent: 12 * dir, scale: 1.08 }, { autoAlpha: 1, xPercent: 0, scale: 1 }, 0)
        .set(cur, { xPercent: 0, scale: 1 })
        .add(() => showCaption(nxt.dataset.caption || ""), 0.35);
      if (progress) progress.kill();
    }

    showCaption(slides[0].dataset.caption || "");
    startProgress();

    const handlers: [EventTarget, string, EventListener][] = [];
    const on = (t: EventTarget, ev: string, fn: EventListener) => { t.addEventListener(ev, fn); handlers.push([t, ev, fn]); };
    on(el.querySelector("#album-prev")!, "click", () => go(index - 1, -1));
    on(el.querySelector("#album-next")!, "click", () => go(index + 1, 1));
    dots.forEach((d, i) => on(d, "click", () => go(i)));
    on(album, "mouseenter", () => progress?.pause()); on(album, "mouseleave", () => progress?.play());
    on(album, "focusin", () => progress?.pause()); on(album, "focusout", () => progress?.play());
    on(album, "keydown", ((e: KeyboardEvent) => { if (e.key === "ArrowLeft") go(index - 1, -1); if (e.key === "ArrowRight") go(index + 1, 1); }) as EventListener);
    return () => { handlers.forEach(([t, ev, fn]) => t.removeEventListener(ev, fn)); progress?.kill(); lastTl?.kill(); split?.revert(); };
  }, { scope: root, dependencies: [list.length] });

  if (!list.length) return null;
  return (
    <section ref={root} className="section section-album" id="album">
      <div className="section-inner">
        <p className="eyebrow">Дурсамжийн албум</p>
        <Heading variant={0}>Маам багшийн он жилүүд</Heading>
        <div className="album" tabIndex={0}>
          <div className="album-stage" id="album-stage">
            {list.map((p, i) => (
              <figure key={p.id} className="slide" data-n={i + 1} data-caption={captionOf(p)}>
                {/* eslint-disable-next-line @next/next/no-img-element -- backend media */}
                <img src={p.image} alt={p.title} onError={(e) => e.currentTarget.parentElement?.classList.add("no-img")} />
              </figure>
            ))}
          </div>
          <p className="album-caption" id="album-caption" aria-live="polite" />
          <div className="album-ui">
            <button className="album-btn" id="album-prev" type="button" aria-label="Өмнөх зураг">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="album-dots" id="album-dots" role="tablist" aria-label="Зургууд">
              {list.map((p, i) => <button key={p.id} type="button" role="tab" aria-selected={i === 0} aria-label={`${i + 1}-р зураг`} />)}
            </div>
            <button className="album-btn" id="album-next" type="button" aria-label="Дараагийн зураг">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
          <div className="album-progress" aria-hidden="true"><span id="album-bar" /></div>
        </div>
      </div>
    </section>
  );
}
