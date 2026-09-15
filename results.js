/* =====================================================================
   ҮР ДҮН — он (2024, 2025) ба ангиар нь байр эзлэлт
   ---------------------------------------------------------------------
   RESULTS объектод он бүрийн, анги бүрийн жагсаалтыг оруулна. Мөр бүр:
     { name: "Сурагчийн нэр", school: "Сургууль", score: 87 }
   Жагсаалтыг оноогоор нь автоматаар эрэмбэлж, байрыг тооцно.
   Эхний 3 байр медалийн өнгөөр тодорно. Оноо тоолж гарч ирнэ.
   ===================================================================== */

/* ⚠ Жишээ мэдээлэл — бодит үр дүнгээр солино уу. */
const RESULTS = {
  "2024": {
    "6":  [
      { name: "Сурагч А", school: "Шинэ Үе сургууль", score: 92 },
      { name: "Сурагч Б", school: "1-р сургууль", score: 88 },
      { name: "Сурагч В", school: "23-р сургууль", score: 85 },
      { name: "Сурагч Г", school: "11-р сургууль", score: 79 },
    ],
    "7":  [
      { name: "Сурагч Д", school: "Шинэ Үе сургууль", score: 94 },
      { name: "Сурагч Е", school: "5-р сургууль", score: 87 },
      { name: "Сурагч Ж", school: "45-р сургууль", score: 81 },
    ],
    "8":  [
      { name: "Сурагч З", school: "2-р сургууль", score: 90 },
      { name: "Сурагч И", school: "Шинэ Үе сургууль", score: 89 },
      { name: "Сурагч К", school: "18-р сургууль", score: 83 },
      { name: "Сурагч Л", school: "33-р сургууль", score: 76 },
    ],
    "9":  [
      { name: "Сурагч М", school: "Шинэ Үе сургууль", score: 95 },
      { name: "Сурагч Н", school: "Орчлон сургууль", score: 88 },
      { name: "Сурагч О", school: "3-р сургууль", score: 80 },
    ],
    "10": [
      { name: "Сурагч П", school: "Сант сургууль", score: 91 },
      { name: "Сурагч Р", school: "Шинэ Үе сургууль", score: 90 },
      { name: "Сурагч С", school: "14-р сургууль", score: 82 },
    ],
    "11": [
      { name: "Сурагч Т", school: "Шинэ Үе сургууль", score: 96 },
      { name: "Сурагч У", school: "Монгени сургууль", score: 92 },
      { name: "Сурагч Ф", school: "28-р сургууль", score: 85 },
      { name: "Сурагч Х", school: "50-р сургууль", score: 78 },
    ],
    "12": [
      { name: "Сурагч Ц", school: "Шинэ Үе сургууль", score: 97 },
      { name: "Сурагч Ч", school: "Хобби сургууль", score: 93 },
      { name: "Сурагч Ш", school: "1-р сургууль", score: 86 },
    ],
  },
  "2025": {
    "6":  [
      { name: "Сурагч А", school: "Шинэ Үе сургууль", score: 95 },
      { name: "Сурагч Б", school: "1-р сургууль", score: 91 },
      { name: "Сурагч В", school: "23-р сургууль", score: 88 },
      { name: "Сурагч Г", school: "Шинэ Үе сургууль", score: 84 },
      { name: "Сурагч Д", school: "11-р сургууль", score: 80 },
    ],
    "7":  [
      { name: "Сурагч Е", school: "Шинэ Үе сургууль", score: 97 },
      { name: "Сурагч Ж", school: "5-р сургууль", score: 90 },
      { name: "Сурагч З", school: "Шинэ Үе сургууль", score: 86 },
      { name: "Сурагч И", school: "45-р сургууль", score: 79 },
    ],
    "8":  [
      { name: "Сурагч К", school: "Шинэ Үе сургууль", score: 93 },
      { name: "Сурагч Л", school: "2-р сургууль", score: 92 },
      { name: "Сурагч М", school: "Шинэ Үе сургууль", score: 85 },
      { name: "Сурагч Н", school: "18-р сургууль", score: 81 },
      { name: "Сурагч О", school: "33-р сургууль", score: 77 },
    ],
    "9":  [
      { name: "Сурагч П", school: "Шинэ Үе сургууль", score: 96 },
      { name: "Сурагч Р", school: "Орчлон сургууль", score: 89 },
      { name: "Сурагч С", school: "Шинэ Үе сургууль", score: 87 },
      { name: "Сурагч Т", school: "3-р сургууль", score: 82 },
    ],
    "10": [
      { name: "Сурагч У", school: "Шинэ Үе сургууль", score: 94 },
      { name: "Сурагч Ф", school: "Сант сургууль", score: 90 },
      { name: "Сурагч Х", school: "14-р сургууль", score: 83 },
      { name: "Сурагч Ц", school: "Шинэ Үе сургууль", score: 78 },
    ],
    "11": [
      { name: "Сурагч Ч", school: "Шинэ Үе сургууль", score: 98 },
      { name: "Сурагч Ш", school: "Монгени сургууль", score: 93 },
      { name: "Сурагч Щ", school: "Шинэ Үе сургууль", score: 88 },
      { name: "Сурагч Э", school: "28-р сургууль", score: 84 },
      { name: "Сурагч Ю", school: "50-р сургууль", score: 80 },
    ],
    "12": [
      { name: "Сурагч Я", school: "Шинэ Үе сургууль", score: 99 },
      { name: "Сурагч А.А", school: "Хобби сургууль", score: 95 },
      { name: "Сурагч Б.Б", school: "Шинэ Үе сургууль", score: 90 },
      { name: "Сурагч В.В", school: "1-р сургууль", score: 86 },
    ],
  },
};

gsap.registerPlugin(ScrollTrigger);

(function initResults() {
  const yearBox = document.getElementById("results-years");
  const tabsBox = document.getElementById("grade-tabs");
  const body    = document.getElementById("results-body");
  if (!yearBox || !tabsBox || !body) return;

  const years  = Object.keys(RESULTS).sort();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let year = null, grade = null;
  let gradeTabs = [], gradeKeys = [];

  /* Оны табууд */
  const yearTabs = years.map((y) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "tab");
    b.textContent = y;
    b.addEventListener("click", () => setYear(y));
    yearBox.appendChild(b);
    return b;
  });

  /* Он солиход ангийн табуудыг дахин үүсгэнэ (жил бүр өөр ангитай байж болно). */
  function setYear(y) {
    if (y === year) return;
    year = y;
    yearTabs.forEach((t, i) => t.classList.toggle("is-active", years[i] === y));

    gradeKeys = Object.keys(RESULTS[y]).sort((a, b) => a - b);
    tabsBox.innerHTML = "";
    gradeTabs = gradeKeys.map((g) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "tab");
      b.textContent = `${g}-р анги`;
      b.addEventListener("click", () => setGrade(g));
      tabsBox.appendChild(b);
      return b;
    });
    if (!reduce) gsap.from(gradeTabs, { autoAlpha: 0, y: 6, duration: 0.3, stagger: 0.04 });

    // Өмнө сонгосон анги энэ онд байвал хадгална, үгүй бол эхнийхийг үзүүлнэ.
    const keep = grade && gradeKeys.includes(grade) ? grade : gradeKeys[0];
    grade = null;
    setGrade(keep);
  }

  /* Хүснэгтийг дүүргэж, анимацитай гаргана. */
  function setGrade(g) {
    if (g === grade) return;
    grade = g;
    gradeTabs.forEach((t, i) => t.classList.toggle("is-active", gradeKeys[i] === g));

    const rows = [...RESULTS[year][g]].sort((a, b) => b.score - a.score);
    const medal = ["gold", "silver", "bronze"];

    const render = () => {
      body.innerHTML = rows.map((r, i) => `
        <tr class="${i < 3 ? "medal medal-" + medal[i] : ""}">
          <td class="rank"><span>${i + 1}</span></td>
          <td class="name">${r.name}</td>
          <td class="school">${r.school}</td>
          <td class="score" data-score="${r.score}">0</td>
        </tr>`).join("");

      const trs = gsap.utils.toArray("tr", body);
      const scores = gsap.utils.toArray(".score", body);

      if (reduce) {
        scores.forEach((s) => (s.textContent = s.dataset.score));
        return;
      }

      gsap.from(trs, { autoAlpha: 0, x: -20, duration: 0.45, ease: "power2.out", stagger: 0.07 });
      gsap.from(gsap.utils.toArray(".rank span", body), {
        scale: 0, duration: 0.5, ease: "back.out(2)", stagger: 0.07, transformOrigin: "50% 50%",
      });
      // Оноо 0-оос тоолж гарч ирнэ.
      scores.forEach((s, i) => {
        const obj = { v: 0 };
        gsap.to(obj, {
          v: Number(s.dataset.score),
          duration: 1.1,
          delay: 0.15 + i * 0.07,
          ease: "power2.out",
          onUpdate: () => (s.textContent = Math.round(obj.v)),
        });
      });
    };

    // Хуучин мөрүүд бүдгэрч, шинэ мөрүүд орж ирнэ.
    const old = gsap.utils.toArray("tr", body);
    if (old.length && !reduce) {
      gsap.to(old, { autoAlpha: 0, x: 20, duration: 0.25, stagger: 0.03, onComplete: render });
    } else {
      render();
    }
  }

  /* Section дэлгэцэнд орж ирэхэд хамгийн сүүлийн оныг үзүүлнэ (анимаци нь харагдана). */
  ScrollTrigger.create({
    trigger: "#results",
    start: "top 70%",
    once: true,
    onEnter: () => setYear(years[years.length - 1]),
  });
})();
