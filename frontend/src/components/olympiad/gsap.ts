"use client";

/* GSAP ба бүх plugin нэг газар бүртгэгдэнэ. Олимпиадын компонентууд зөвхөн эндээс импортолно. */

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(useGSAP, ScrollTrigger, ScrollSmoother, DrawSVGPlugin, MotionPathPlugin, SplitText);

/** Хэрэглэгч "хөдөлгөөн багасгах" тохиргоотой эсэх (SSR дээр false). */
export const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export { gsap, useGSAP, ScrollTrigger, ScrollSmoother, DrawSVGPlugin, MotionPathPlugin, SplitText };
