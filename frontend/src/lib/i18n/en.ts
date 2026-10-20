/* Англи толь бичиг — mn.ts-ийн `Dict` бүтцийг яг хангана. */

import type { Dict } from "./mn";

export const en: Dict = {
  meta: {
    siteName: "Shine Ue School",
    defaultDescription: "Official website of Shine Ue School, Ulaanbaatar: programmes (IBDP, Cambridge, National), news, graduates and contact.",
    title: (page: string) => `${page} — Shine Ue School`,
  },
  common: {
    unavailable: "Information is temporarily unavailable.",
    notFoundTitle: "Page not found",
    notFoundText: "The page you are looking for does not exist or has moved.",
    backHome: "Back to home",
    loading: "Loading",
  },
  nav: {
    main: "Main menu",
    left: "Main menu, left",
    right: "Main menu, right",
    logo: "Shine Ue School, home page",
    logoAlt: "Shine Ue School",
    open: "Open menu",
    close: "Close menu",
    olympiad: "Olympiad",
    language: "Choose language",
  },
  footer: {
    name: "Shine Ue School",
    pages: "Pages",
  },
};
