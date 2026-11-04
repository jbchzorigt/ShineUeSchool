/* Сайтын бүтэн URL (canonical, hreflang, og:url, хуваалцах холбоос) — зөвхөн server талд.
   NEXT_PUBLIC_SITE_URL тохируулаагүй бол Vercel-ийн системийн VERCEL_PROJECT_PRODUCTION_URL (production домэйн), эцэст нь localhost. */

const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? (vercel ? `https://${vercel}` : "http://localhost:3000");
