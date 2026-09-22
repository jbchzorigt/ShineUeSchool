"use client";

/* Бүртгэлийн диалог: 1 Имэйл → 2 Код → 3 Мэдээлэл → Амжилттай.
   Token 401 болвол кодын алхам руу буцна; `club`/`grade` алдаа (дүүрсэн/хаагдсан/суудал дүүрсэн) бол дээд хэсэгт улаанаар + router.refresh(). */

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Button, Field, Input, Select } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { Club, ClubRegistration } from "@/lib/types";
import { EMAIL_DOMAIN, formatFee } from "./format";

type Step = "email" | "code" | "form" | "done";
const STEPS: { key: Step; label: string }[] = [{ key: "email", label: "Имэйл" }, { key: "code", label: "Код" }, { key: "form", label: "Мэдээлэл" }];
const RESEND_SECONDS = 60;

const emptyForm = { student_last_name: "", student_first_name: "", guardian_last_name: "", guardian_first_name: "", phone: "" };

/* Ашиглагч `key={club?.id}` өгнө: дугуйлан солигдоход компонент дахин mount болж state шинээр эхэлнэ. */
export function RegisterDialog({ club, grade, onClose }: { club: Club | null; grade: number | null; onClose: () => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [formGrade, setFormGrade] = useState<number>(() => {
    if (!club) return 0;
    const open = club.quotas.filter((q) => !q.full).map((q) => q.grade);
    return grade !== null && open.includes(grade) ? grade : (open[0] ?? club.grades[0] ?? 0);
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [result, setResult] = useState<ClubRegistration | null>(null);

  // Нээх/хаах (state-д нөлөөлөхгүй — зөвхөн DOM)
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (club && !d.open) d.showModal();
    if (!club && d.open) d.close();
  }, [club]);

  // "Дахин илгээх" тоолуур
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  function fail(err: unknown, fallback: string) {
    if (err instanceof ApiError) {
      if (err.status === 401 && step === "form") { setToken(""); setStep("code"); setErrors({ code: err.message }); return; }
      const fe = err.fieldErrors;
      setErrors(Object.keys(fe).length ? fe : { non_field_errors: err.message || fallback });
      if (fe.club || fe.grade) router.refresh();
      return;
    }
    setErrors({ non_field_errors: fallback });
  }

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    const addr = email.trim().toLowerCase();
    if (!addr.endsWith("@" + EMAIL_DOMAIN)) { setErrors({ email: `Зөвхөн @${EMAIL_DOMAIN} хаягаар бүртгүүлнэ` }); return; }
    setBusy(true); setErrors({});
    try {
      await api.clubs.sendCode(addr);
      setEmail(addr); setCode(""); setStep("code"); setResendIn(RESEND_SECONDS);
    } catch (err) { fail(err, "Код илгээж чадсангүй."); } finally { setBusy(false); }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErrors({});
    try {
      const r = await api.clubs.verifyCode(email, code.trim());
      setToken(r.token); setStep("form");
    } catch (err) { fail(err, "Кодыг шалгаж чадсангүй."); } finally { setBusy(false); }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!club) return;
    setBusy(true); setErrors({});
    try {
      const r = await api.clubs.register({ token, club_id: club.id, grade: formGrade, ...form });
      setResult(r); setStep("done");
    } catch (err) { fail(err, "Бүртгэж чадсангүй."); } finally { setBusy(false); }
  }

  function close() {
    if (step === "done") router.refresh();
    onClose();
  }

  const set = (k: keyof typeof emptyForm) => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const idx = STEPS.findIndex((s) => s.key === step);

  return (
    <dialog ref={ref} onClose={close} onClick={(e) => e.target === ref.current && close()}
            className="m-auto w-[min(96vw,520px)] rounded-2xl bg-white p-0 shadow-xl backdrop:bg-slate-900/60" aria-label="Дугуйланд бүртгүүлэх">
      {club && (
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-extrabold text-navy">{club.name}</h2>
              <p className="text-sm text-muted">Бүртгүүлэх</p>
            </div>
            <button type="button" onClick={close} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Хаах">✕</button>
          </div>

          {step !== "done" && (
            <ol className="mb-5 flex gap-2 text-xs font-semibold" aria-label="Алхмууд">
              {STEPS.map((s, i) => (
                <li key={s.key} aria-current={s.key === step ? "step" : undefined}
                    className={`flex flex-1 items-center gap-1.5 rounded-full px-3 py-1.5 ${i <= idx ? "bg-navy text-white" : "bg-paper-3 text-muted"}`}>
                  <span>{i + 1}</span><span>{s.label}</span>
                </li>
              ))}
            </ol>
          )}

          {errors.non_field_errors && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.non_field_errors}</p>}
          {errors.club && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.club}</p>}
          {errors.detail && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.detail}</p>}

          {step === "email" && (
            <form onSubmit={sendCode} className="space-y-4">
              <Field label="Сурагчийн имэйл" error={errors.email} hint={`Зөвхөн @${EMAIL_DOMAIN} хаяг. Баталгаажуулах код илгээнэ.`}>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={`нэр@${EMAIL_DOMAIN}`} autoFocus required />
              </Field>
              <Button type="submit" className="w-full" disabled={busy}>Код илгээх</Button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={verify} className="space-y-4">
              <p className="text-sm text-ink"><span className="font-semibold">{email}</span> хаяг руу 6 оронтой код илгээлээ.</p>
              <Field label="Код" error={errors.code}>
                <Input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={code}
                       onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="text-center text-2xl tracking-[0.4em]" autoFocus required />
              </Field>
              <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>Баталгаажуулах</Button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => { setStep("email"); setErrors({}); }} className="font-semibold text-navy hover:underline">Хаяг солих</button>
                <button type="button" onClick={() => sendCode()} disabled={busy || resendIn > 0} className="font-semibold text-navy hover:underline disabled:text-muted disabled:no-underline">
                  {resendIn > 0 ? `Дахин илгээх (${resendIn})` : "Дахин илгээх"}
                </button>
              </div>
            </form>
          )}

          {step === "form" && (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Сурагчийн овог" error={errors.student_last_name}><Input value={form.student_last_name} onChange={set("student_last_name")} maxLength={80} required autoFocus /></Field>
                <Field label="Сурагчийн нэр" error={errors.student_first_name}><Input value={form.student_first_name} onChange={set("student_first_name")} maxLength={80} required /></Field>
                <Field label="Бүртгүүлэгчийн овог" error={errors.guardian_last_name}><Input value={form.guardian_last_name} onChange={set("guardian_last_name")} maxLength={80} required /></Field>
                <Field label="Бүртгүүлэгчийн нэр" error={errors.guardian_first_name}><Input value={form.guardian_first_name} onChange={set("guardian_first_name")} maxLength={80} required /></Field>
                <Field label="Холбоо барих дугаар" error={errors.phone}><Input type="tel" value={form.phone} onChange={set("phone")} maxLength={30} required /></Field>
                <Field label="Анги" error={errors.grade}>
                  <Select value={formGrade} onChange={(e) => setFormGrade(Number(e.target.value))}>
                    {club.quotas.map((q) => (
                      <option key={q.grade} value={q.grade} disabled={q.full}>
                        {q.grade}-р анги · {q.full ? "дүүрсэн" : `${q.slots_left} сул`}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Имэйл"><Input value={email} readOnly className="bg-paper-2 text-muted" /></Field>
              <Button type="submit" className="w-full" disabled={busy}>Бүртгүүлэх</Button>
            </form>
          )}

          {step === "done" && result && (
            <div className="space-y-4">
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-emerald-900">
                <p className="font-semibold">✓ {result.student_last_name} {result.student_first_name} «{result.club.name}» дугуйланд бүртгэгдлээ</p>
                <p className="mt-1 text-sm">{result.email} · {result.grade}-р анги</p>
              </div>
              {result.club.is_paid && <p className="text-sm text-ink">Төлбөр: <span className="font-semibold">{formatFee(result.club)}</span> — сургууль дээр төлнө.</p>}
              <Button className="w-full" onClick={close}>Хаах</Button>
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
