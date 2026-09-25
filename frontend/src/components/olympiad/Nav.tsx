"use client";

/* Дээд цэс: голд сургуулийн бүтэн лого (public/logo-full.png — үндсэн сайттай ижил), зүүн талд Нүүр · Хуваарь, баруун талд
   Үр дүн · ← Сургуулийн сайт + жижиг "2026" хавтан (статик). Долгион зам + MotionPath дүрсүүд ард нь, hover доогуур зураас,
   идэвхтэй холбоос ScrollTrigger-ээр солигдоно. */

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { buildYear } from "@/lib/yearTiles";
import { gsap, ScrollTrigger, useGSAP } from "./gsap";

const NAVY = "#1E3A8F";
const GOLD = "#FFC20E";
const LEFT = [{ href: "#hero", label: "Нүүр" }, { href: "#schedule", label: "Хуваарь" }];
const RIGHT = [{ href: "#results", label: "Үр дүн" }];
const Ul = () => <svg className="ul" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M2,6 Q25,1 50,6 T98,6" /></svg>;

export function Nav({ year }: { year: number }) {
  const nav = useRef<HTMLElement>(null);
  const art = useRef<SVGSVGElement>(null);
  const navYear = useRef<SVGSVGElement>(null);

  useGSAP(() => {
    const navEl = nav.current!, artEl = art.current!;
    buildYear(navYear.current!, String(year), "nav");

    /* --------------------- долгион зам (өргөнөөс хамаарна) — nav.js buildArt --------------------- */
    let wave: SVGPathElement | null = null, travelers: Element[] = [], travelTweens: gsap.core.Tween[] = [];
    function buildArt() {
      const W = navEl.clientWidth, H = navEl.clientHeight;
      artEl.setAttribute("viewBox", `0 0 ${W} ${H}`);
      const base = H - 10, amp = 6, seg = 160;
      let d = `M-20,${base}`;
      for (let x = -20; x < W + seg; x += seg) d += ` Q${x + seg / 4},${base - amp} ${x + seg / 2},${base} T${x + seg},${base}`;
      artEl.innerHTML = `
        <path id="nav-wave" d="${d}" fill="none" stroke="${NAVY}" stroke-opacity="0.22" stroke-width="2"/>
        <g class="tr tr-dot"><circle r="5" fill="${GOLD}"/></g>
        <g class="tr tr-diamond"><rect x="-5" y="-5" width="10" height="10" fill="${NAVY}"/></g>
        <g class="tr tr-ring"><circle r="5" fill="none" stroke="${GOLD}" stroke-width="2.5"/></g>`;
      wave = artEl.querySelector("#nav-wave");
      travelers = gsap.utils.toArray<Element>(".tr", artEl);
    }

    const mm = gsap.matchMedia();
    mm.add({ reduce: "(prefers-reduced-motion: reduce)", ok: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
      const reduce = !!ctx.conditions?.reduce;
      // Resize таймер: callback-ийн гадна тодорхойлж, доорх cleanup-аас хандах боломжтой болгоно
      let resizeTimer: ReturnType<typeof setTimeout> | undefined;
      buildArt();
      if (reduce) {
        gsap.set(wave, { drawSVG: "0% 100%" });
        gsap.set(travelers, { autoAlpha: 0 });
        return;
      }
      const enter = gsap.timeline({ defaults: { ease: "power2.inOut" } });
      enter
        .from(navEl.querySelector(".brand"), { autoAlpha: 0, y: -8, duration: 0.7, ease: "power2.out" })
        .from(wave, { drawSVG: "0% 0%", duration: 1.6, ease: "power1.inOut" }, 0.2)
        .from(navEl.querySelectorAll(".nav-year .tile"), { scale: 0, transformOrigin: "50% 50%", duration: 0.5, ease: "back.out(1.6)", stagger: { each: 0.015, from: "start" } }, 0.5)
        .from(navEl.querySelectorAll(".nav-links li"), { autoAlpha: 0, y: 8, duration: 0.5, stagger: 0.08, ease: "power2.out" }, 0.4);

      function startTravel() {
        travelTweens.forEach((t) => t.kill());
        travelTweens = travelers.map((el, i) => gsap.to(el, {
          duration: 14 + i * 4, repeat: -1, ease: "none", delay: -i * 5,
          motionPath: { path: wave!, align: wave!, alignOrigin: [0.5, 0.5], autoRotate: i === 1 },
        }));
        gsap.set(artEl.querySelectorAll(".tr-diamond rect"), { rotation: 45, transformOrigin: "50% 50%" });
      }
      startTravel();

      const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { buildArt(); startTravel(); }, 150); };
      window.addEventListener("resize", onResize);
      return () => { window.removeEventListener("resize", onResize); clearTimeout(resizeTimer); travelTweens.forEach((t) => t.kill()); enter.kill(); };
    });

    /* Hover: доогуур зураас; гүйлгэхэд идэвхтэй холбоос — nav.js */
    const links = gsap.utils.toArray<HTMLAnchorElement>(".nav-links a", navEl);
    const cleanups: (() => void)[] = [];
    links.forEach((link) => {
      const path = link.querySelector(".ul path");
      if (!path) return;
      gsap.set(path, { drawSVG: link.classList.contains("is-active") ? "0% 100%" : "0% 0%" });
      const enter = () => gsap.to(path, { drawSVG: "0% 100%", duration: 0.45, ease: "power2.out", overwrite: true });
      const leave = () => { if (!link.classList.contains("is-active")) gsap.to(path, { drawSVG: "100% 100%", duration: 0.35, ease: "power2.in", overwrite: true }); };
      link.addEventListener("mouseenter", enter); link.addEventListener("mouseleave", leave);
      cleanups.push(() => { link.removeEventListener("mouseenter", enter); link.removeEventListener("mouseleave", leave); });
    });
    function setActive(hash: string) {
      links.forEach((l) => {
        const on = l.getAttribute("href") === hash;
        l.classList.toggle("is-active", on);
        const path = l.querySelector(".ul path");
        if (path) gsap.to(path, { drawSVG: on ? "0% 100%" : "0% 0%", duration: 0.4, overwrite: true });
      });
    }
    links.forEach((l) => {
      const h = () => { const href = l.getAttribute("href") || ""; if (href.startsWith("#")) setActive(href); };
      l.addEventListener("click", h); cleanups.push(() => l.removeEventListener("click", h));
    });
    // Секцүүд DOM-д бүрэн орсны дараа (хүүхэд секцүүд Nav-ийн дараа mount болж болно)
    const sectionTriggers: ScrollTrigger[] = [];
    const raf = requestAnimationFrame(() => {
      ["#hero", "#schedule", "#results"].forEach((id) => {
        if (!document.querySelector(id)) return;
        sectionTriggers.push(ScrollTrigger.create({ trigger: id, start: "top 50%", end: "bottom 50%", onToggle: (self) => { if (self.isActive) setActive(id); } }));
      });
    });
    return () => {
      cancelAnimationFrame(raf);
      sectionTriggers.forEach((t) => t.kill());
      mm.revert();
      // StrictMode-ийн давхар mount-аас үүсэх давхардсан tile/зам үлдэгдлийг цэвэрлэнэ (дараагийн mount дахин зурна)
      if (navYear.current) navYear.current.innerHTML = "";
      artEl.innerHTML = "";
      cleanups.forEach((f) => f());
    };
  }, { scope: nav });

  return (
    <nav ref={nav} className="topbar" id="topbar" aria-label="Үндсэн цэс">
      <svg ref={art} className="nav-art" id="nav-art" aria-hidden="true" />
      {/* Зүүн цэс */}
      <ul className="nav-links nav-left">
        {LEFT.map((l, i) => <li key={l.href}><a href={l.href} className={i === 0 ? "is-active" : undefined}>{l.label}<Ul /></a></li>)}
      </ul>
      {/* Голд: сургуулийн лого (үндсэн сайттай ижил) */}
      <a className="brand" href="#hero" aria-label="Шинэ Үе сургууль — олимпиадын нүүр">
        <Image src="/logo-full.png" alt="Шинэ Үе сургууль" width={483} height={143} priority className="brand-logo" />
      </a>
      {/* Баруун цэс + оны хавтан */}
      <div className="nav-right">
        <ul className="nav-links">
          {RIGHT.map((l) => <li key={l.href}><a href={l.href}>{l.label}<Ul /></a></li>)}
          <li><Link href="/" className="nav-site">← Сургуулийн сайт<Ul /></Link></li>
        </ul>
        <a className="nav-year-link" href="#section-1" aria-label={`${year} хэсэг рүү очих`}>
          <svg ref={navYear} className="nav-year" id="nav-year" viewBox="0 0 1500 500" aria-hidden="true" />
        </a>
      </div>
    </nav>
  );
}
