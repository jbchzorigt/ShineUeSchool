/* Дэлхийн газрын зургийн SVG path-ууд — SERVER дээр нэг удаа тооцоолно (d3-geo + world-atlas 110m topojson), client bundle-д
   d3/topojson орохгүй. Проекц: Natural Earth, Номхон далай голд (rotate 155°E) — Монгол зүүн-төвд, Америк баруун талд,
   Монголоос АНУ руу нум далай дээгүүр явна. Нум = проекцлогдсон цэгүүдийн хоорондох Bézier (arc()) — зүсэлт давахгүй. */

import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
import landTopo from "world-atlas/land-110m.json";
import { MONGOLIA } from "./home-data";
import type { GraduateDestination } from "./types";

export interface MapData {
  width: number; height: number;
  land: string;                                             // газар (land-110m) нэг path (суурь)
  countries: { code: string; d: string }[];                 // очсон улсуудын дүүргэлт
  mongolia: string;                                         // Монголын хил (gold дүүргэлт)
  home: { x: number; y: number };                           // Улаанбаатар
  arcs: { code: string; d: string; x: number; y: number }[]; // Монгол → улс нум + төгсгөлийн цэг
}

const W = 1000, H = 520;

/** Нислэгийн нум: проекцлогдсон 2 цэгийн хооронд квадрат Bézier (дунд цэгээс перпендикуляр, дээш бөхийсөн). Проекцийн
    зүсэлтийг (25°W) огт давахгүй тул great-circle шиг таслагдахгүй (Бразил, Аргентин г.м.). */
function arc(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || 1;
  let nx = -dy / dist, ny = dx / dist;           // перпендикуляр
  if (ny > 0) { nx = -nx; ny = -ny; }             // дээш (y багасах) чиглэлийг сонгоно
  const k = Math.min(dist * 0.22, 110);
  const cx = (a.x + b.x) / 2 + nx * k, cy = (a.y + b.y) / 2 + ny * k;
  return `M${a.x},${a.y} Q${Math.round(cx * 10) / 10},${Math.round(cy * 10) / 10} ${b.x},${b.y}`;
}
const cache = new Map<string, MapData>();   // улсын кодуудын багцаар (админаас өөрчлөгдөж болно)

export function buildMapData(destinations: GraduateDestination[]): MapData {
  const key = destinations.map((d) => d.code).join(",");
  const hit = cache.get(key);
  if (hit) return hit;
  const DESTINATIONS = destinations;
  const topo = world as unknown as Topology<{ countries: GeometryCollection }>;
  const countries = feature(topo, topo.objects.countries);
  const lt = landTopo as unknown as Topology<{ land: GeometryCollection }>;
  const land = feature(lt, lt.objects.land);   // нэг "газар" feature — улсын хилгүй тул path 2 дахин бага
  const proj = geoNaturalEarth1().rotate([-155, 0]).fitSize([W, H], land);
  const path = geoPath(proj).digits(0);        // 1000px өргөнд бүхэл тоо хангалттай (HTML жин багасна)
  const byId = new Map(countries.features.map((f) => [String(f.id), f]));
  const pt = (c: [number, number]) => { const p = proj(c) ?? [0, 0]; return { x: Math.round(p[0] * 10) / 10, y: Math.round(p[1] * 10) / 10 }; };
  const home = pt(MONGOLIA.coords);

  const data: MapData = {
    width: W, height: H,
    land: path(land) ?? "",
    countries: DESTINATIONS.flatMap((d) => { const f = byId.get(d.numeric); return f ? [{ code: d.code, d: path(f) ?? "" }] : []; }),
    mongolia: (() => { const f = byId.get(MONGOLIA.numeric); return f ? path(f) ?? "" : ""; })(),
    home,
    arcs: DESTINATIONS.map((d) => { const e = pt(d.coords); return { code: d.code, d: arc(home, e), ...e }; }),
  };
  if (cache.size > 20) cache.clear();
  cache.set(key, data);
  return data;
}
