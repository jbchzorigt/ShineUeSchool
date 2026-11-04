/* Хэлний нэгдсэн цэг: замын функцууд (paths.ts) + толь бичиг. Server ба client компонентууд хоёулаа импортолно. */

import { en } from "./en";
import { mn, type Dict } from "./mn";
import type { Lang } from "./paths";

export * from "./paths";
export type { Dict };

const DICTS: Record<Lang, Dict> = { mn, en };

export const getDict = (lang: Lang): Dict => DICTS[lang];
