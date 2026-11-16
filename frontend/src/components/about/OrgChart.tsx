"use client";

/* Байгууллагын бүтэц (/about): удирдлагын гишүүд харьяаллаар (parent_id) мод, тэнхимүүд харьяалагдах гишүүнийхээ доор (leader_id).
   - Бүтэц: салаа ul > li (дэлгэц уншигчид шатлал уншигдана). Холбох шугам — бодит span (aria-hidden): GSAP pseudo element-ийг хөдөлгөж чадахгүй.
     md+: хэвтээ мод — эцэг дээр, хүүхдүүд доор мөрөнд; хүүхэд бүрийн дээр хэвтээ салааны хоёр хагас + босоо иш. Гар утсанд: босоо догол мод —
     хүүхэд бүр зүүн талын босоо төмөр (rail) + хэвтээ тохой. Нэг DOM, responsive классаар; өргөн мод зөвхөн энэ контейнерт хажуу тийш гүйнэ.
   - Хөдөлгөөн: хэсэг дэлгэцэнд орход нэг удаа (IntersectionObserver — ScrollSmoother дор ScrollTrigger ажилладаггүй, Reveal.tsx-ийг үз):
     түвшин бүрт шугам ургана → картууд гарна → доошоо иш … нийт ~2 сек. Шугамын чиглэлийг (хэвтээ/босоо) тухайн үеийн хэмжээгээр тодорхойлно.
     Картуудыг зөвхөн JS-ээр (gsap.set) нууна — JS ажиллахгүй, reduced motion үед шууд харагдана. */

import { useRef } from "react";
import { gsap, reduceMotion, useGSAP } from "@/components/site/gsap";
import { useDict } from "@/components/site/LangProvider";
import { Reveal } from "@/components/site/Reveal";
import { buildOrgTree, type OrgNode } from "@/lib/org-tree";
import type { AboutDepartment, AboutLeader } from "@/lib/types";
import { DepartmentCard, LeaderCard } from "./OrgCards";

type Entry = { key: string; depth: number } & ({ kind: "leader"; node: OrgNode } | { kind: "dept"; dept: AboutDepartment });

const LINE = "pointer-events-none absolute bg-navy/30";

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
      <span data-org-line data-role="down" data-depth={node.depth} data-v="top" aria-hidden="true" className="mx-auto hidden h-6 w-0.5 bg-navy/30 md:block" />
      <ul className="flex flex-col pl-3 md:flex-row md:justify-center md:pl-0">
        {entries.map((e, i) => <Item key={e.key} entry={e} first={i === 0} last={i === entries.length - 1} />)}
      </ul>
    </>
  );
}

function Item({ entry, first, last }: { entry: Entry; first: boolean; last: boolean }) {
  const d = entry.depth;
  return (
    <li className="relative flex flex-col pt-3 pl-5 md:items-center md:px-2.5 md:pt-6">
      {/* гар утас: зүүн босоо төмөр (сүүлийнх нь тохой хүртэл) · md+: хэвтээ салааны зүүн хагас (эхний хүүхэдд байхгүй) */}
      <span data-org-line data-depth={d} data-h="right" data-v="top" aria-hidden="true"
            className={`${LINE} left-0 top-0 w-0.5 ${last ? "h-10" : "h-full"} md:right-1/2 md:h-0.5 md:w-auto ${first ? "md:hidden" : ""}`} />
      {/* md+: хэвтээ салааны баруун хагас (сүүлийн хүүхэдд байхгүй) */}
      {!last && <span data-org-line data-depth={d} data-h="left" aria-hidden="true" className={`${LINE} left-1/2 right-0 top-0 hidden h-0.5 md:block`} />}
      {/* гар утас: төмрөөс карт руу хэвтээ тохой · md+: салаанаас карт руу босоо иш */}
      <span data-org-line data-depth={d} data-h="left" data-v="top" aria-hidden="true"
            className={`${LINE} left-0 top-10 h-0.5 w-5 md:left-[calc(50%-1px)] md:top-0 md:h-6 md:w-0.5`} />
      <div data-org-card data-depth={d}>
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

  useGSAP(() => {
    const el = root.current;
    // Мод контейнерээс өргөн бол хамгийн дээд карт (модны голд) харагдахаар голлуулна
    if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    if (!el || reduceMotion()) return;
    const cards = gsap.utils.toArray<HTMLElement>("[data-org-card]", el);
    // display:none (тухайн дэлгэцийн өргөнд хэрэггүй) шугамыг алгасна
    const lines = gsap.utils.toArray<HTMLElement>("[data-org-line]", el).filter((l) => l.offsetWidth > 0 || l.offsetHeight > 0);
    if (!cards.length) return;
    const depth = (x: HTMLElement) => Number(x.dataset.depth);
    gsap.set(cards, { autoAlpha: 0, y: 16 });
    for (const l of lines) {
      gsap.set(l, l.offsetWidth > l.offsetHeight
        ? { scaleX: 0, transformOrigin: `${l.dataset.h ?? "left"} center` }
        : { scaleY: 0, transformOrigin: `center ${l.dataset.v ?? "top"}` });
    }
    const max = Math.max(...cards.map(depth));
    const step = gsap.utils.clamp(0.12, 0.35, 2 / ((max + 1) * 3.4));   // нийт ~2 сек
    const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" }, onComplete: () => { gsap.set([...cards, ...lines], { clearProps: "all" }); } });
    for (let d = 0; d <= max; d++) {
      const into = lines.filter((l) => depth(l) === d && l.dataset.role !== "down");
      if (into.length) tl.to(into, { scaleX: 1, scaleY: 1, duration: step });
      tl.to(cards.filter((c) => depth(c) === d), { autoAlpha: 1, y: 0, duration: step * 1.4, stagger: Math.min(0.06, step / 4) });
      const down = lines.filter((l) => depth(l) === d && l.dataset.role === "down");
      if (down.length) tl.to(down, { scaleY: 1, duration: step });
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
        <div ref={root} className="overflow-x-auto pb-2">
          <div className="md:mx-auto md:w-max md:min-w-full">
            <ul aria-label={t.orgAria} className="flex flex-col gap-8 md:flex-row md:items-start md:justify-center md:gap-10">
              {roots.map((n) => (
                <li key={n.leader.id} className="flex flex-col md:items-center">
                  <div data-org-card data-depth={0}><LeaderCard leader={n.leader} root /></div>
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
