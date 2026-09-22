/* Олимпиадын хуудасны чимэглэлийн томъёо (KaTeX). index.html-ийн .formula элементүүдийн өгөгдөл. */

export interface Formula { tex: string; grade: string; speed: number; cls: string }

export const FORMULAS: Record<"year" | "about" | "contact" | "schedule" | "results", Formula[]> = {
  year: [
    { tex: "S = a \\cdot b", grade: "6-р анги", speed: 0.6, cls: "f1-a" },
    { tex: "\\frac{a}{b} + \\frac{c}{d} = \\frac{ad + bc}{bd}", grade: "6-р анги", speed: 1.1, cls: "f1-b" },
    { tex: "a^2 - b^2 = (a - b)(a + b)", grade: "7-р анги", speed: 0.8, cls: "f1-c" },
    { tex: "P = 2(a + b)", grade: "6-р анги", speed: 1.3, cls: "f1-d" },
  ],
  about: [
    { tex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}", grade: "9-р анги", speed: 0.7, cls: "f2-a" },
    { tex: "a^2 + b^2 = c^2", grade: "8-р анги", speed: 1.2, cls: "f2-b" },
    { tex: "S = \\pi r^2", grade: "8-р анги", speed: 0.9, cls: "f2-c" },
    { tex: "\\sin^2\\alpha + \\cos^2\\alpha = 1", grade: "10-р анги", speed: 1.4, cls: "f2-d" },
    { tex: "(a + b)^2 = a^2 + 2ab + b^2", grade: "8-р анги", speed: 0.5, cls: "f2-e" },
  ],
  contact: [
    { tex: "\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1", grade: "11-р анги", speed: 0.8, cls: "f3-a" },
    { tex: "\\int_a^b f(x)\\,dx = F(b) - F(a)", grade: "12-р анги", speed: 1.2, cls: "f3-b" },
    { tex: "\\frac{d}{dx}\\, x^n = n x^{n-1}", grade: "12-р анги", speed: 0.6, cls: "f3-c" },
    { tex: "\\log_a b = \\frac{\\ln b}{\\ln a}", grade: "11-р анги", speed: 1.0, cls: "f3-d" },
    { tex: "V = \\frac{4}{3}\\pi r^3", grade: "11-р анги", speed: 1.4, cls: "f3-e" },
  ],
  schedule: [
    { tex: "\\frac{a}{b} = \\frac{c}{d} \\Rightarrow ad = bc", grade: "7-р анги", speed: 0.7, cls: "f4-a" },
    { tex: "S = \\frac{a \\cdot h}{2}", grade: "7-р анги", speed: 1.2, cls: "f4-b" },
    { tex: "a^m \\cdot a^n = a^{m+n}", grade: "8-р анги", speed: 0.9, cls: "f4-c" },
    { tex: "\\sqrt{a \\cdot b} = \\sqrt{a} \\cdot \\sqrt{b}", grade: "8-р анги", speed: 1.4, cls: "f4-d" },
  ],
  results: [
    { tex: "\\log_a (xy) = \\log_a x + \\log_a y", grade: "10-р анги", speed: 0.8, cls: "f5-a" },
    { tex: "C_n^k = \\frac{n!}{k!\\,(n-k)!}", grade: "11-р анги", speed: 1.1, cls: "f5-b" },
    { tex: "S_n = \\frac{n(a_1 + a_n)}{2}", grade: "9-р анги", speed: 0.6, cls: "f5-c" },
    { tex: "\\cos 2\\alpha = 1 - 2\\sin^2\\alpha", grade: "10-р анги", speed: 1.3, cls: "f5-d" },
  ],
};
