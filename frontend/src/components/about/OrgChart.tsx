"use client";

/* Байгууллагын бүтэц (/about): удирдлагын гишүүд харьяаллаар (parent_id) мод, тэнхимүүд харьяалагдах гишүүнийхээ доор (leader_id).
   - Бүтэц: салаа ul > li (дэлгэц уншигчид шатлал уншигдана). Холбоос — бодит span (aria-hidden), зөөлөн navy:
     md+: эцгийн доор босоо иш → хүүхдүүдийн дээгүүр салаа; хоёр захын хүүхэд дугуйрсан тохой (border + radius), дундынх нь "T".
     Гар утсанд: босоо догол мод — зүүн талын төмөр + карт руу тохой, сүүлийн хүүхэд дугуйрсан тохой. Шугам карттай нийлэх цэгт жижиг алтан цэг.
     md+ ба гар утасны холбоос тусдаа span (md:hidden / hidden md:block) — тус бүр өөрийн зурах чиглэлтэй (data-draw).
   - Өргөн мод зөвхөн энэ контейнерт хажуу тийш гүйнэ (гар утсанд ч картын доод өргөнтэй, гүн модонд мөн); гүйлгэх боломжтой үед контейнер
     гарын товчлуураар focus авна (tabindex), md+ дээр хамгийн дээд карт голд харагдахаар голлуулна.
   - Хөдөлгөөн: хэсэг дэлгэцэнд орход нэг удаа (IntersectionObserver — ScrollSmoother дор ScrollTrigger ажилладаггүй, Reveal.tsx-ийг үз):
     түвшин бүрт холбоос үзэгний зураас шиг зурагдана (clip-path) → картууд + алтан цэг → доошоо иш … нийт ~2 сек.
     Картуудыг зөвхөн JS-ээр (gsap.set) нууна — JS ажиллахгүй, reduced motion үед шууд харагдана. */

import { useEffect, useRef } from "react";
import { gsap, reduceMotion, useGSAP } from "@/components/site/gsap";
import { useDict } from "@/components/site/LangProvider";
import { Reveal } from "@/components/site/Reveal";
import { buildOrgTree, type OrgNode } from "@/lib/org-tree";
import type { AboutDepartment, AboutLeader } from "@/lib/types";
import { DepartmentCard, LeaderCard } from "./OrgCards";

type Entry = { key: string; depth: number } & ({ kind: "leader"; node: OrgNode } | { kind: "dept"; dept: AboutDepartment });

const BASE = "pointer-events-none absolute";
const FILL = `${BASE} bg-navy/25`;
const EDGE = `${BASE} border-navy/25`;
/** Зурах эхлэл (clip-path inset): top — дээрээс доош, left/right — тухайн захаас, center — голоос хоёр тийш */
const FROM: Record<string, string> = { top: "inset(0% 0% 100% 0%)", left: "inset(0% 100% 0% 0%)", right: "inset(0% 0% 0% 100%)", center: "inset(0% 50% 0% 50%)" };

/** Гишүүний доор харагдах мөр: эхлээд доод гишүүд, дараа нь тэнхимүүд */
function entriesOf(n: OrgNode): Entry[] {
  return [
    ...n.children.map((c): Entry => ({ key: `l${c.leader.id}`, depth: c.depth, kind: "leader", node: c })),
    ...n.departments.map((d): Entry => ({ key: `d${d.id}`, depth: n.depth + 1, kind: "dept", dept: d })),
  ];
}

/** Картын доорх босоо иш (md+) ба хүүхдүүдийн мөр */
function Below({ node }: { node: OrgNode }) {
  const entries = entriesOf(node);
  if (!entries.length) return null;
  return (
    <>
      <span data-org-line data-role="down" data-draw="top" data-depth={node.depth} aria-hidden="true" className="mx-auto hidden h-8 w-0.5 bg-navy/25 md:block" />
      <ul className="flex flex-col pl-3 md:flex-row md:justify-center md:pl-0">
        {entries.map((e, i) => <Item key={e.key} entry={e} first={i === 0} last={i === entries.length - 1} />)}
      </ul>
    </>
  );
}

/** md+ холбоос: ганц хүүхэд — шулуун иш; захын хүүхэд — дугуйрсан тохой (салаа + иш нэг span); дундынх — салаа + иш ("T") */
function DesktopLink({ d, first, last }: { d: number; first: boolean; last: boolean }) {
  const stem = <span data-org-line data-draw="top" data-depth={d} aria-hidden="true" className={`${FILL} left-[calc(50%-1px)] top-0 hidden h-8 w-0.5 md:block`} />;
  if (first && last) return stem;
  if (first) return <span data-org-line data-draw="right" data-depth={d} aria-hidden="true" className={`${EDGE} left-[calc(50%-1px)] right-0 top-0 hidden h-8 rounded-tl-2xl border-l-2 border-t-2 md:block`} />;
  if (last) return <span data-org-line data-draw="left" data-depth={d} aria-hidden="true" className={`${EDGE} left-0 right-[calc(50%-1px)] top-0 hidden h-8 rounded-tr-2xl border-r-2 border-t-2 md:block`} />;
  return <>{stem}<span data-org-line data-draw="center" data-depth={d} aria-hidden="true" className={`${FILL} inset-x-0 top-0 hidden h-0.5 md:block`} /></>;
}

/** Гар утасны холбоос: төмөр + тохой; сүүлийн хүүхэд — дугуйрсан тохой (төмөр тохой хүртэл) */
function MobileLink({ d, last }: { d: number; last: boolean }) {
  if (last) return <span data-org-line data-draw="top" data-depth={d} aria-hidden="true" className={`${EDGE} left-0 top-0 h-[2.625rem] w-5 rounded-bl-xl border-b-2 border-l-2 md:hidden`} />;
  return (
    <>
      <span data-org-line data-draw="top" data-depth={d} aria-hidden="true" className={`${FILL} left-0 top-0 h-full w-0.5 md:hidden`} />
      <span data-org-line data-draw="left" data-depth={d} aria-hidden="true" className={`${FILL} left-0 top-10 h-0.5 w-5 md:hidden`} />
    </>
  );
}

function Item({ entry, first, last }: { entry: Entry; first: boolean; last: boolean }) {
  const d = entry.depth;
  return (
    <li className="relative flex flex-col pt-3 pl-5 md:items-center md:px-3 md:pt-8">
      <MobileLink d={d} last={last} />
      <DesktopLink d={d} first={first} last={last} />
      {/* холбоос карттай нийлэх алтан цэг */}
      <span data-org-dot data-depth={d} aria-hidden="true"
            className={`${BASE} z-[1] left-[calc(1.25rem-5px)] top-[calc(2.5rem-4px)] h-2.5 w-2.5 rounded-full bg-gold ring-[3px] ring-paper-2 md:left-[calc(50%-5px)] md:top-[calc(2rem-5px)]`} />
      <div data-org-card data-depth={d} className="min-w-56 md:min-w-0">
        {entry.kind === "leader" ? <LeaderCard leader={entry.node.leader} root={false} /> : <DepartmentCard department={entry.dept} />}
      </div>
      {entry.kind === "leader" && <Below node={entry.node} />}
    </li>
  );
}

export function OrgChart({ leaders, departments }: { leaders: AboutLeader[]; departments: AboutDepartment[] }) {
  const t = useDict().about;
  const root = useRef<HTMLDivElement>(null);
  const roots = buildOrgTree(leaders, departments);

  // Гүйлгэх боломжтой (мод контейнерээс өргөн) үед л гарын товчлуураар focus авна
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const sync = () => { if (el.scrollWidth > el.clientWidth + 1) el.setAttribute("tabindex", "0"); else el.removeAttribute("tabindex"); };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, []);

  useGSAP(() => {
    const el = root.current;
    if (!el) return;
    // md+: мод контейнерээс өргөн бол хамгийн дээд карт (модны голд) харагдахаар голлуулна (гар утсанд үндэс зүүн талд тул эхнээс)
    if (el.scrollWidth > el.clientWidth && window.matchMedia("(min-width: 768px)").matches) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    if (reduceMotion()) return;
    const cards = gsap.utils.toArray<HTMLElement>("[data-org-card]", el);
    const dots = gsap.utils.toArray<HTMLElement>("[data-org-dot]", el);
    // display:none (тухайн дэлгэцийн өргөнд хэрэггүй) холбоосыг алгасна
    const lines = gsap.utils.toArray<HTMLElement>("[data-org-line]", el).filter((l) => l.offsetWidth > 0 || l.offsetHeight > 0);
    if (!cards.length) return;
    const depth = (x: HTMLElement) => Number(x.dataset.depth);
    gsap.set(cards, { autoAlpha: 0, y: 16 });
    gsap.set(dots, { scale: 0 });
    for (const l of lines) gsap.set(l, { clipPath: FROM[l.dataset.draw ?? "top"] });
    const max = Math.max(...cards.map(depth));
    const step = gsap.utils.clamp(0.14, 0.4, 2 / ((max + 1) * 3.4));   // нийт ~2 сек
    const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" }, onComplete: () => { gsap.set([...cards, ...lines, ...dots], { clearProps: "all" }); } });
    for (let d = 0; d <= max; d++) {
      const into = lines.filter((l) => depth(l) === d && l.dataset.role !== "down");
      if (into.length) tl.to(into, { clipPath: "inset(0% 0% 0% 0%)", duration: step, ease: "power1.inOut" });
      tl.to(cards.filter((c) => depth(c) === d), { autoAlpha: 1, y: 0, duration: step * 1.4, stagger: Math.min(0.06, step / 4) });
      const ds = dots.filter((x) => depth(x) === d);
      if (ds.length) tl.to(ds, { scale: 1, duration: step, ease: "back.out(3)", stagger: Math.min(0.06, step / 4) }, "<");
      const down = lines.filter((l) => depth(l) === d && l.dataset.role === "down");
      if (down.length) tl.to(down, { clipPath: "inset(0% 0% 0% 0%)", duration: step, ease: "power1.inOut" });
    }
    // Аль хэдийн дэлгэцэнд байвал шууд (Reveal-тэй ижил)
    if (el.getBoundingClientRect().top < window.innerHeight * 0.85) { tl.play(); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { tl.play(); io.disconnect(); }
    }, { rootMargin: "0px 0px -15% 0px", threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, { scope: root });

  if (!roots.length) return null;
  return (
    <section aria-labelledby="org-title" className="bg-paper-2">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-12 md:px-10 lg:gap-12 lg:px-24 lg:py-[72px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <Reveal><h2 id="org-title" className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">{t.orgTitle}</h2></Reveal>
          <Reveal><p className="max-w-[34em] text-muted lg:text-lg">{t.orgLead}</p></Reveal>
        </div>
        <div ref={root} role="region" aria-label={t.orgAria}
             className="overflow-x-auto rounded-xl pb-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy">
          <div className="md:mx-auto md:w-max md:min-w-full">
            <ul className="flex flex-col gap-8 md:flex-row md:items-start md:justify-center md:gap-10">
              {roots.map((n) => (
                <li key={n.leader.id} className="flex flex-col md:items-center">
                  <div data-org-card data-depth={0} className="min-w-56 md:min-w-0"><LeaderCard leader={n.leader} root /></div>
                  <Below node={n} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
