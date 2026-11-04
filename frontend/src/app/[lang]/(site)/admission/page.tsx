/* /admission, /en/admission — Элсэлт. Хоёр тусдаа хэсэг, тус бүр админы асаах/унтраах товч + эцсийн хугацаатай
   (backend/app/admissions): "Шалгалтын бүртгэл" ба "Шалгалтын дүн". Хэсэг зөвхөн асаалттай БА хугацаа
   дуусаагүй үед л харагдана — хугацаа өнгөрмөгц backend автоматаар унтрааж, сайтаас алга болно.
   Ээлжийн нэр, шалгалтын мэдээлэл англиар бөглөгдөөгүй бол /en дээр монголоор (backend fallback). */

import type { Metadata } from "next";
import Link from "next/link";
import { AdmissionSignup, RemindCode } from "@/components/admission/AdmissionSignup";
import { gradeSpan } from "@/components/admission/format";
import { SiteFooter } from "@/components/home/SiteFooter";
import { formatDateTime } from "@/components/news/format";
import { Reveal } from "@/components/site/Reveal";
import { fetchAdmission } from "@/lib/admissions-api";
import { CONTACT } from "@/lib/home-data";
import { getDict, isLang, localePath, type Lang } from "@/lib/i18n";
import { alternates } from "@/lib/i18n/metadata";

type Params = Promise<{ lang: string }>;
const langOf = async (params: Params): Promise<Lang> => { const { lang } = await params; return isLang(lang) ? lang : "mn"; };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const lang = await langOf(params);
  const t = getDict(lang);
  return { title: t.meta.title(t.admission.title), description: t.admission.description, alternates: alternates("/admission", lang) };
}

const sectionTitle = "font-display text-[24px] font-extrabold text-navy lg:text-[30px]";

export default async function Page({ params }: { params: Params }) {
  const lang = await langOf(params);
  const t = getDict(lang).admission;
  const data = await fetchAdmission(lang);
  const round = data?.round ?? null;
  const reg = round?.registration.open ? round.registration : null;
  const res = round?.results.open ? round.results : null;
  const date = (iso: string) => formatDateTime(iso, lang);

  const remind = (
    <>
      <h3 className="font-display text-lg font-extrabold text-navy">{t.forgotTitle}</h3>
      <p className="mb-4 mt-1 text-sm text-muted">{t.forgotLead}</p>
      <RemindCode />
    </>
  );

  return (
    <>
      <main className="paper-grid flex flex-1 flex-col">
        <Reveal as="section" className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-4 py-10 md:px-10 lg:gap-14 lg:px-24 lg:py-[72px]">
          <div>
            <h1 className="font-display text-[32px] font-extrabold text-navy lg:text-[44px]">{t.title}</h1>
            {round && (reg || res) && <p className="mt-2 text-[17px] text-muted lg:text-lg">{round.name}</p>}
          </div>

          {!data ? (
            <p className="text-muted">{t.unavailable}</p>
          ) : !round || (!reg && !res) ? (
            <p className="max-w-[40em] rounded-xl border border-line bg-white px-5 py-4 text-[15px] text-ink">
              {t.closedBefore}{" "}
              <a href={`mailto:${CONTACT.email}`} className="font-semibold text-navy underline underline-offset-4">{CONTACT.email}</a>{t.closedAfter}
            </p>
          ) : (
            <>
              {res && (
                <section aria-labelledby="results-title">
                  <Reveal className="flex flex-col gap-4 rounded-2xl border-2 border-navy bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between lg:p-8">
                    <div>
                      <h2 id="results-title" className={sectionTitle}>{t.resultsTitle}</h2>
                      <p className="mt-1 text-[15px] text-muted">
                        {t.resultsLead}{" "}
                        {res.deadline && <span className="tabular-nums">{t.visibleUntil(date(res.deadline))}</span>}
                      </p>
                    </div>
                    <Link href={localePath(lang, "/admission/results")} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-gold px-6 py-3 text-base font-bold text-navy hover:bg-gold/90">
                      {t.viewResults}
                    </Link>
                  </Reveal>
                </section>
              )}

              {reg && (
                <section aria-labelledby="signup-title" className="flex flex-col gap-6">
                  <div>
                    <h2 id="signup-title" className={sectionTitle}>{t.signupTitle}</h2>
                    {reg.deadline && (
                      <p className="mt-1 text-[15px] text-muted">
                        {t.registrationUntil[0]}<span className="font-semibold tabular-nums text-ink">{date(reg.deadline)}</span>{t.registrationUntil[1]}
                      </p>
                    )}
                  </div>
                  <Reveal stagger delay={0.15} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-12">
                    <aside className="flex flex-col gap-6">
                      <dl className="grid gap-4 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{t.gradesLabel}</dt>
                          <dd className="mt-1 font-display text-xl font-extrabold text-ink">{t.grades(gradeSpan(round.grades))}</dd>
                        </div>
                        {reg.deadline && (
                          <div>
                            <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{t.deadlineLabel}</dt>
                            <dd className="mt-1 text-[17px] tabular-nums text-ink">{date(reg.deadline)}</dd>
                          </div>
                        )}
                        {round.test_info && (
                          <div className="border-t border-line pt-4">
                            <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{t.testLabel}</dt>
                            <dd className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-ink">{round.test_info}</dd>
                          </div>
                        )}
                      </dl>
                      <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">{remind}</div>
                    </aside>
                    <AdmissionSignup round={round} />
                  </Reveal>
                </section>
              )}

              {!reg && res && <div className="max-w-xl rounded-2xl border border-line bg-white p-5 sm:p-6">{remind}</div>}
            </>
          )}
        </Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
