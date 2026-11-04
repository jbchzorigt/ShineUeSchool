"use client";

/* Элсэлтийн бүртгэл: 1 Имэйл → 2 Код → 3 Мэдээлэл → Элсэгчийн код (дэлгэцэнд + имэйлээр).
   Нэг имэйлээр ах дүүсийг тус тусад нь бүртгэж болно ("Өөр хүүхэд бүртгэх" — кодын алхмыг давтахгүй, token 30 мин).
   Хэл: текстүүд толь бичгээс (admission), API-д `lang` дамжуулна — алдааны мессеж, имэйлүүд тухайн хэлээр. */

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { gsap, reduceMotion, useGSAP } from "@/components/site/gsap";
import { useDict, useLang } from "@/components/site/LangProvider";
import { Button, Field, Input, Select } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { AdmissionApplication, AdmissionRoundPublic } from "@/lib/types";

type Step = "email" | "code" | "form" | "done";
const STEPS: ("email" | "code" | "form")[] = ["email", "code", "form"];
const RESEND_SECONDS = 60;

const emptyForm = {
  child_last_name: "", child_first_name: "", birth_date: "", gender: "" as "" | "male" | "female", current_school: "",
  guardian_last_name: "", guardian_first_name: "", phone: "",
};

export function AdmissionSignup({ round }: { round: AdmissionRoundPublic }) {
  const lang = useLang();
  const t = useDict().admission;
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [grade, setGrade] = useState<number>(round.grades.length === 1 ? round.grades[0] : 0);
  const [form, setForm] = useState(emptyForm);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [result, setResult] = useState<AdmissionApplication | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Алхам солигдоход шинэ алхмын агуулга баруунаас гулсаж орно (эхний render-т биш — хуудасны Reveal хариуцна)
  const firstStep = useRef(true);
  useGSAP(() => {
    if (firstStep.current) { firstStep.current = false; return; }
    // "done" алхамд самбар unmount болсон — scope null бол selector бүх хуудсыг хайх тул зогсооно
    if (!panelRef.current || reduceMotion()) return;
    gsap.from("[data-step-body]", { autoAlpha: 0, x: 24, duration: 0.4, ease: "power2.out" });
    gsap.from("[aria-current='step']", { scale: 0.94, duration: 0.35, ease: "back.out(2)" });
  }, { scope: panelRef, dependencies: [step] });

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  function fail(err: unknown, fallback: string) {
    if (err instanceof ApiError) {
      if (err.status === 401 && step === "form") { setToken(""); setStep("code"); setErrors({ code: err.message }); return; }
      const fe = err.fieldErrors;
      setErrors(Object.keys(fe).length && !("detail" in fe) ? fe : { non_field_errors: err.message || fallback });
      return;
    }
    setErrors({ non_field_errors: fallback });
  }

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true); setErrors({});
    try {
      await api.admissions.sendCode(email.trim(), lang);
      setEmail(email.trim().toLowerCase()); setCode(""); setStep("code"); setResendIn(RESEND_SECONDS);
    } catch (err) { fail(err, t.sendFailed); } finally { setBusy(false); }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErrors({});
    try {
      const r = await api.admissions.verifyCode(email, code.trim(), lang);
      setToken(r.token); setStep("form");
    } catch (err) { fail(err, t.verifyFailed); } finally { setBusy(false); }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!grade) { setErrors({ grade: t.chooseGrade }); return; }
    if (!form.gender) { setErrors({ gender: t.chooseGender }); return; }
    if (!consent) { setErrors({ consent: t.consentRequired }); return; }
    setBusy(true); setErrors({});
    try {
      const r = await api.admissions.apply({ token, lang, grade, consent, ...form, gender: form.gender });
      setResult(r); setStep("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) { fail(err, t.applyFailed); } finally { setBusy(false); }
  }

  function another() {
    setForm({ ...emptyForm, guardian_last_name: form.guardian_last_name, guardian_first_name: form.guardian_first_name, phone: form.phone });
    setConsent(false); setResult(null); setErrors({}); setStep("form");
  }

  const set = (k: keyof typeof emptyForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const idx = STEPS.indexOf(step as (typeof STEPS)[number]);

  if (step === "done" && result) return <Done result={result} onAnother={another} />;

  return (
    <div ref={panelRef} className="overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
      <h2 className="font-display text-[22px] font-extrabold text-navy">{t.register}</h2>
      <ol className="mb-6 mt-4 flex gap-2 text-xs font-semibold" aria-label={t.stepsAria}>
        {STEPS.map((s, i) => (
          <li key={s} aria-current={s === step ? "step" : undefined}
              className={`flex flex-1 items-center gap-1.5 rounded-full px-3 py-1.5 ${i <= idx ? "bg-navy text-white" : "bg-paper-3 text-muted"}`}>
            <span>{i + 1}</span><span>{t.steps[s]}</span>
          </li>
        ))}
      </ol>

      {errors.non_field_errors && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.non_field_errors}</p>}

      {step === "email" && (
        <form data-step-body onSubmit={sendCode} className="space-y-4">
          <Field label={t.emailLabel} error={errors.email} hint={t.emailHint}>
            <Input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPlaceholder} required />
          </Field>
          <Button type="submit" className="w-full py-2.5" disabled={busy}>{t.sendCode}</Button>
        </form>
      )}

      {step === "code" && (
        <form data-step-body onSubmit={verify} className="space-y-4">
          <p className="text-sm text-ink">{t.codeSent[0]}<span className="font-semibold">{email}</span>{t.codeSent[1]}</p>
          <Field label={t.codeLabel} error={errors.code}>
            <Input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={code}
                   onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="text-center text-2xl tracking-[0.4em]" autoFocus required />
          </Field>
          <Button type="submit" className="w-full py-2.5" disabled={busy || code.length !== 6}>{t.verify}</Button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={() => { setStep("email"); setErrors({}); }} className="font-semibold text-navy hover:underline">{t.changeEmail}</button>
            <button type="button" onClick={() => sendCode()} disabled={busy || resendIn > 0} className="font-semibold text-navy hover:underline disabled:text-muted disabled:no-underline">
              {resendIn > 0 ? t.resendIn(resendIn) : t.resend}
            </button>
          </div>
        </form>
      )}

      {step === "form" && (
        <form data-step-body onSubmit={submit} className="space-y-6">
          <fieldset className="space-y-4">
            <legend className="mb-3 text-sm font-bold text-navy">{t.applicant}</legend>
            <Field label={t.gradeField} error={errors.grade}>
              <Select value={grade} onChange={(e) => setGrade(Number(e.target.value))} required>
                {round.grades.length > 1 && <option value={0} disabled>{t.choose}</option>}
                {round.grades.map((g) => <option key={g} value={g}>{t.grade(g)}</option>)}
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.lastName} error={errors.child_last_name}><Input value={form.child_last_name} onChange={set("child_last_name")} maxLength={80} autoComplete="off" required autoFocus /></Field>
              <Field label={t.firstName} error={errors.child_first_name}><Input value={form.child_first_name} onChange={set("child_first_name")} maxLength={80} autoComplete="off" required /></Field>
              <Field label={t.birthDate} error={errors.birth_date}><Input type="date" value={form.birth_date} onChange={set("birth_date")} required /></Field>
              <Field label={t.gender} error={errors.gender}>
                <Select value={form.gender} onChange={set("gender")} required>
                  <option value="" disabled>{t.choose}</option>
                  <option value="female">{t.female}</option>
                  <option value="male">{t.male}</option>
                </Select>
              </Field>
            </div>
            <Field label={t.currentSchool} error={errors.current_school} hint={t.optional}>
              <Input value={form.current_school} onChange={set("current_school")} maxLength={160} />
            </Field>
          </fieldset>

          <fieldset className="space-y-4 border-t border-line pt-5">
            <legend className="mb-3 text-sm font-bold text-navy">{t.guardian}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.lastName} error={errors.guardian_last_name}><Input value={form.guardian_last_name} onChange={set("guardian_last_name")} maxLength={80} autoComplete="family-name" required /></Field>
              <Field label={t.firstName} error={errors.guardian_first_name}><Input value={form.guardian_first_name} onChange={set("guardian_first_name")} maxLength={80} autoComplete="given-name" required /></Field>
              <Field label={t.phone} error={errors.phone}><Input type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} maxLength={30} required /></Field>
              <Field label={t.email}><Input value={email} readOnly className="bg-paper-2 text-muted" /></Field>
            </div>
          </fieldset>

          <label className="flex items-start gap-3 rounded-lg bg-paper-2 p-3 text-sm text-ink">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-navy" />
            <span>
              {t.consent}
              {errors.consent && <span className="mt-1 block text-xs font-medium text-red-600">{errors.consent}</span>}
            </span>
          </label>
          <Button type="submit" className="w-full py-2.5" disabled={busy}>{t.register}</Button>
        </form>
      )}
    </div>
  );
}

function Done({ result, onAnother }: { result: AdmissionApplication; onAnother: () => void }) {
  const t = useDict().admission;
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const copy = () => navigator.clipboard?.writeText(result.code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});

  // Амжилтын дараалал: карт гарч ирнэ → ✓ "pop" → код тэмдэгт тэмдэгтээр (тасалбар хэвлэгдэх мэт) → бусад мэдээлэл
  useGSAP(() => {
    if (reduceMotion()) return;
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .from(ref.current, { autoAlpha: 0, y: 24, duration: 0.5 })
      .from("[data-anim='check']", { scale: 0, rotation: -45, duration: 0.45, ease: "back.out(3)" }, "-=0.2")
      .from("[data-anim='ticket']", { scaleY: 0.6, autoAlpha: 0, duration: 0.4, transformOrigin: "50% 0%" }, "-=0.15")
      .from("[data-anim='char']", { yPercent: 70, autoAlpha: 0, rotationX: -80, duration: 0.45, stagger: 0.045, transformOrigin: "50% 100%" }, "-=0.1")
      .from("[data-anim='after']", { autoAlpha: 0, y: 10, duration: 0.4, stagger: 0.08 }, "-=0.2");
  }, { scope: ref });

  return (
    <div ref={ref} className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7" role="status">
      <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
        <span data-anim="check" aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-emerald-600 text-[13px] text-white">✓</span>
        {t.success}
      </p>
      <h2 className="mt-1 font-display text-[22px] font-extrabold text-navy">
        {result.child_last_name} {result.child_first_name} · {t.grade(result.grade)}
      </h2>
      <div data-anim="ticket" className="mt-5 rounded-xl border-2 border-dashed border-navy/40 bg-paper-2 p-5 text-center [perspective:600px]">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t.applicantCode}</p>
        {/* Тэмдэгт бүр тусдаа span (анимацид) — сонгож хуулахад нэг л текст хэвээр */}
        <p className="mt-1 select-all font-mono text-[34px] font-bold tracking-[0.12em] text-navy sm:text-[42px]">
          {[...result.code].map((ch, i) => <span key={i} data-anim="char" className="inline-block">{ch}</span>)}
        </p>
        <div className="mt-3 flex justify-center gap-2 print:hidden">
          <Button type="button" variant="ghost" onClick={copy}>{copied ? t.copied : t.copyCode}</Button>
          <Button type="button" variant="ghost" onClick={() => window.print()}>{t.print}</Button>
        </div>
      </div>
      <ul data-anim="after" className="mt-5 space-y-2 text-[15px] text-ink">
        <li>{t.keepCode}</li>
        <li>{t.codeEmailed[0]}<span className="font-semibold">{result.email}</span>{t.codeEmailed[1]}</li>
      </ul>
      {result.test_info && (
        <div data-anim="after" className="mt-5 border-t border-line pt-4">
          <p className="text-sm font-bold text-navy">{t.testInfo}</p>
          <p className="mt-1 whitespace-pre-line text-[15px] text-ink">{result.test_info}</p>
        </div>
      )}
      <div data-anim="after" className="mt-6 print:hidden">
        <Button type="button" variant="secondary" onClick={onAnother}>{t.another}</Button>
      </div>
    </div>
  );
}

/* Кодоо мартсан: имэйлд бүртгэлтэй кодуудыг дахин илгээнэ (бүртгэлтэй эсэхийг хариунаас мэдэгдэхгүй). */
export function RemindCode() {
  const lang = useLang();
  const t = useDict().admission;
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setState("busy");
    try { await api.admissions.remind(email.trim(), lang); setState("sent"); } catch { setState("error"); }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label={t.remindEmail}>
        <Input type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setState("idle"); }} required />
      </Field>
      <Button type="submit" variant="ghost" className="border border-line" disabled={state === "busy"}>{t.remindSubmit}</Button>
      {state === "sent" && <p role="status" className="text-sm text-ink">{t.remindSent}</p>}
      {state === "error" && <p role="alert" className="text-sm text-red-700">{t.remindFailed}</p>}
    </form>
  );
}
