"use client";

/* Олон нийтийн сайтын GSAP: зөвхөн ScrollTrigger + ScrollSmoother (олимпиадын бүх plugin-ийг ачаалахгүй).
   Сайтын компонентууд зөвхөн эндээс импортолно. */

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";

gsap.registerPlugin(useGSAP, ScrollTrigger, ScrollSmoother);

/** Хэрэглэгч "хөдөлгөөн багасгах" тохиргоотой эсэх (SSR дээр false). */
export const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export { gsap, useGSAP, ScrollTrigger, ScrollSmoother };
