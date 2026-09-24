"use client";

/* Олимпиадын хуудасны client root: .olympiad дизайны хүрээ, ScrollSmoother wrapper, секцүүдийн дараалал.
   Nav (T4), Hero (T5), Album (T6), Schedule (T7), Results (T8), YearTiles (T9) тус тусын task-д нэмэгдэнэ. */

import { latestYear } from "@/lib/olympiad-api";
import type { AlbumPhoto, OlympiadPage as PageSettings, Result, Stage, Years } from "@/lib/types";
import { About } from "./About";
import { Album } from "./Album";
import { Contact } from "./Contact";
import { Hero } from "./Hero";
import { Nav } from "./Nav";
import { Results } from "./Results";
import { Schedule } from "./Schedule";
import { Smoother } from "./Smoother";
import { YearTiles } from "./YearTiles";

export interface OlympiadData {
  page: PageSettings | null;
  years: Years | null;
  stages: Stage[] | null;
  results: Result[] | null;
  album: AlbumPhoto[] | null;
}

/** "2026" хавтан ба хуваарийн анхдагч он: хуваарийн хамгийн сүүлийн жил, байхгүй бол одоогийн он. */
export function OlympiadPage({ page, years, stages, results, album }: OlympiadData) {
  return (
    <div className="olympiad">
      {/* Хамгийн эхний хүүхэд: layout effect нь Nav болон бусад секцүүдийнхээс өмнө ажиллаж, ScrollSmoother-ийг
          тэдгээрийн ScrollTrigger үүсэхээс өмнө бэлтгэнэ. */}
      <Smoother />
      <Nav year={latestYear(years)} />
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <Hero page={page} />
          <Album photos={album} />
          <Schedule stages={stages} currentYear={latestYear(years)} />
          <Results results={results} />
          <YearTiles year={latestYear(years)} />
          <About page={page} />
          <Contact page={page} />
        </div>
      </div>
    </div>
  );
}
