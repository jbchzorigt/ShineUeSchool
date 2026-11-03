"use client";

/* Элсэлтийн удирдлага (manager): ээлж (зарлал) үүсгэх, идэвхжүүлэх, элсэгчдийн жагсаалт.
   Ээлж бүрт хоёр тусдаа хэсэг — "Шалгалтын бүртгэл" ба "Шалгалтын дүн" — тус бүр асаах/унтраах товч + эцсийн
   хугацаатай (SectionPanel). Хугацаа өнгөрмөгц backend автоматаар унтраана; самбар 30 секунд тутам шинэчлэгдэж
   үүнийг харуулна. Дүн: Excel татах → оноо/дүн бөглөх → буцааж оруулах → асаах. Нийтийн дүнд зөвхөн код, анги, оноо, дүн. */

import Link from "next/link";
import { useDeferredValue, useEffect, useRef, useState, type ChangeEvent } from "react";
import { ApplicantEdit } from "@/components/admin/admissions/ApplicantEdit";
import { RoundForm } from "@/components/admin/admissions/RoundForm";
import { SectionPanel } from "@/components/admin/admissions/SectionPanel";
import { formatScore, RESULT_LABEL, RESULT_TONE } from "@/components/admission/format";
import { formatGrades } from "@/components/clubs/format";
import { formatDateTime } from "@/components/news/format";
import { Badge, Button, Card, Empty, Input, Select, Spinner, Table, Td, Th } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { AdmissionApplicantAdmin, AdmissionImportReport, AdmissionRoundAdmin } from "@/lib/types";
import { useFetch } from "@/lib/useFetch";

export default function AdmissionsAdminPage() {
  const rounds = useFetch(() => api.admissionsAdmin.rounds.list(), []);
  const [picked, setPicked] = useState<number | null>(null);
  const [form, setForm] = useState<AdmissionRoundAdmin | "new" | null>(null);
  const [grade, setGrade] = useState(0);
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim());
  const [editing, setEditing] = useState<AdmissionApplicantAdmin | null>(null);
  const [report, setReport] = useState<AdmissionImportReport | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const list = rounds.data ?? [];
  const current = list.find((r) => r.id === picked) ?? list.find((r) => r.is_active) ?? list[0] ?? null;
  const applicants = useFetch(() => (current ? api.admissionsAdmin.applicants.list(current.id, { grade: grade || undefined, q: q || undefined }) : null),
                              [current?.id, grade, q]);
  const reloadAll = () => { rounds.reload(); applicants.reload(); };

  // Хугацаа өнгөрөхөд backend товчийг унтраадаг — нээлттэй самбарт ч харагдахын тулд 30 сек тутам шинэчилнэ
  const reloadRounds = rounds.reload;
  useEffect(() => {
    const id = window.setInterval(() => { if (document.visibilityState === "visible") reloadRounds(); }, 30_000);
    return () => window.clearInterval(id);
  }, [reloadRounds]);

  async function act(fn: () => Promise<unknown>, ok?: string) {
    setBusy(true); setMsg(null);
    try { await fn(); if (ok) setMsg({ tone: "ok", text: ok }); reloadAll(); }
    // FieldError нь {талбар: [мессеж]} (detail-гүй) тул эхний талбарын мессежийг харуулна
    catch (e) { setMsg({ tone: "error", text: e instanceof ApiError ? (Object.values(e.fieldErrors).find((v) => v && v !== "undefined") ?? e.message) : "Алдаа гарлаа." }); }
    finally { setBusy(false); }
  }

  async function download() {
    if (!current) return;
    await act(async () => {
      const blob = await api.admissionsAdmin.rounds.downloadXlsx(current.id);
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `elselt-${current.code_prefix}.xlsx` });
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !current) return;
    setReport(null);
    await act(async () => setReport(await api.admissionsAdmin.rounds.importResults(current.id, file)));
  }

  /** Нэг хэсгийн товч/хугацааг хадгална. Амжилттай бол true. */
  async function saveSection(r: AdmissionRoundAdmin, kind: "registration" | "results", p: { enabled?: boolean; deadline?: string }): Promise<boolean> {
    const flag = kind === "registration" ? "registration_open" : "results_published";
    const deadlineKey = kind === "registration" ? "registration_deadline" : "results_deadline";
    if (kind === "results" && p.enabled === true && !confirm(`${r.results_count} элсэгчийн дүнг нийтлэх үү? Нийтийн хуудсанд зөвхөн код, анги, оноо, дүн харагдана.`)) return false;
    const label = kind === "registration" ? "Шалгалтын бүртгэл" : "Шалгалтын дүн";
    const ok = p.enabled === true ? `${label} асаалттай — сайтад харагдаж байна.` : p.enabled === false ? `${label} унтарлаа — сайтаас нуугдсан.` : "Эцсийн хугацааг хадгаллаа.";
    let saved = false;
    await act(async () => {
      await api.admissionsAdmin.rounds.update(r.id, { ...(p.enabled !== undefined && { [flag]: p.enabled }), ...(p.deadline && { [deadlineKey]: p.deadline }) });
      saved = true;
    }, ok);
    return saved;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-navy">Элсэлт</h1>
          <p className="text-sm text-slate-600">Жил бүрийн элсэлтийн зарлал, бүртгэл, шалгалтын дүн. Олон нийтэд зөвхөн идэвхтэй ээлж харагдана.</p>
        </div>
        <Button onClick={() => setForm("new")}>+ Шинэ ээлж</Button>
      </div>

      {rounds.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{rounds.error}</p>}
      {msg && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.tone === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
      {rounds.loading ? <Spinner /> : list.length === 0 ? <Empty>Элсэлтийн ээлж байхгүй. «Шинэ ээлж» дарж эхэлнэ үү.</Empty> : (
        <div className="flex flex-wrap gap-2">
          {list.map((r) => (
            <button key={r.id} type="button" onClick={() => { setPicked(r.id); setReport(null); setGrade(0); setQuery(""); }}
                    className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${current?.id === r.id ? "border-navy bg-navy text-white" : "border-slate-300 bg-white text-slate-700 hover:border-navy"}`}>
              {r.name}{r.is_active && " ●"}
            </button>
          ))}
        </div>
      )}

      {current && (
        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-navy">{current.name}</h2>
                {current.is_active ? <Badge tone="navy">Идэвхтэй ээлж</Badge> : <Badge tone="slate">Идэвхгүй ээлж</Badge>}
              </div>
              <p className="text-sm text-slate-600">
                {formatGrades(current.grades)} · код <span className="font-mono">{current.code_prefix}-XXXXX</span> ·{" "}
                <span className="tabular-nums">{current.applicants_count} элсэгч · {current.results_count} дүнтэй</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => setForm(current)}>Засах</Button>
              {!current.is_active && <Button variant="ghost" disabled={busy} onClick={() => act(() => api.admissionsAdmin.rounds.update(current.id, { is_active: true }), "Идэвхжүүллээ.")}>Идэвхжүүлэх</Button>}
              {current.applicants_count === 0 && (
                <Button variant="danger" disabled={busy} onClick={() => confirm("Ээлжийг устгах уу?") && act(async () => { await api.admissionsAdmin.rounds.remove(current.id); setPicked(null); }, "Устгалаа.")}>Устгах</Button>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionPanel
              key={`reg-${current.id}-${current.registration.deadline}`}
              title="Шалгалтын бүртгэл"
              hint="Асаалттай үед /admission хуудсанд элсэлтийн шалгалтын бүртгэл гарна."
              section={current.registration}
              busy={busy}
              blockedReason={!current.is_active ? "Эхлээд ээлжийг идэвхжүүлнэ үү."
                : current.results.enabled ? "Шалгалтын дүн асаалттай үед бүртгэлийг асаах боломжгүй — эхлээд дүнг унтраана уу." : undefined}
              onSave={(p) => saveSection(current, "registration", p)}
            >
              <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-sm">
                <span className="tabular-nums text-slate-600">{current.applicants_count} элсэгч бүртгүүлсэн</span>
                {current.registration.enabled && current.is_active && <Link href="/admission" target="_blank" className="ml-auto font-semibold text-navy hover:underline">Бүртгэлийн хуудас ↗</Link>}
              </div>
            </SectionPanel>

            <SectionPanel
              key={`res-${current.id}-${current.results.deadline}`}
              title="Шалгалтын дүн"
              hint="Асаалттай үед /admission/results хуудсанд дүн (код, анги, оноо, дүн) нийтлэгдэнэ."
              section={current.results}
              busy={busy}
              blockedReason={!current.is_active ? "Эхлээд ээлжийг идэвхжүүлнэ үү."
                : current.registration.enabled ? "Шалгалтын бүртгэл асаалттай үед дүнг асаах боломжгүй — эхлээд бүртгэлийг унтраана уу."
                : current.results_count === 0 ? "Нийтлэхээс өмнө дүн оруулна уу (доорх Excel)." : undefined}
              onSave={(p) => saveSection(current, "results", p)}
            >
              <div className="flex flex-col gap-3 border-t border-slate-100 pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="ghost" className="border border-slate-300" disabled={busy} onClick={download}>⇩ Excel татах</Button>
                  <Button variant="ghost" className="border border-slate-300" disabled={busy} onClick={() => fileRef.current?.click()}>⇧ Дүн оруулах (Excel)</Button>
                  <input ref={fileRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={upload} />
                  {current.results.enabled && current.is_active && <Link href="/admission/results" target="_blank" className="ml-auto text-sm font-semibold text-navy hover:underline">Дүнгийн хуудас ↗</Link>}
                </div>
                <p className="text-xs text-slate-500">
                  Татсан файлын «Оноо», «Дүн» баганыг бөглөөд оруулна. Дүн: Тэнцсэн / Нөөц / Тэнцээгүй / Ирээгүй.
                  {current.results_published_at && <> Сүүлд нийтэлсэн: <span className="tabular-nums">{formatDateTime(current.results_published_at)}</span>.</>}
                </p>
                {report && (
                  report.applied ? (
                    <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                      Оруулсан: {report.updated} шинэчлэгдсэн, {report.unchanged} өөрчлөлтгүй{report.skipped_blank ? `, ${report.skipped_blank} хоосон мөр алгассан` : ""}.
                      {!current.results.enabled && " Бэлэн болмогц эцсийн хугацаа тавиад дүнгийн хэсгийг асаана уу."}
                    </p>
                  ) : (
                    <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                      <p className="font-semibold">Файлд {report.errors.length} алдаа байгаа тул юу ч хадгалсангүй:</p>
                      <ul className="mt-1 max-h-48 list-disc overflow-y-auto pl-5">{report.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                    </div>
                  )
                )}
              </div>
            </SectionPanel>
          </div>
        </Card>
      )}

      {current && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {/* ui.tsx-ийн Select/Input нь w-full — өргөнийг wrapper-ээр тогтооно */}
            <div className="w-40">
              <Select value={grade} onChange={(e) => setGrade(Number(e.target.value))} aria-label="Анги">
                <option value={0}>Бүх анги</option>
                {current.grades.map((g) => <option key={g} value={g}>{g}-р анги</option>)}
              </Select>
            </div>
            <div className="w-full max-w-sm">
              <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Код, нэр, утас, имэйлээр хайх" aria-label="Хайх" />
            </div>
          </div>
          {applicants.loading ? <Spinner /> : applicants.error ? <p className="text-sm text-red-700">{applicants.error}</p> :
            !applicants.data?.length ? <Empty>{q || grade ? "Илэрц алга." : "Одоогоор бүртгүүлсэн элсэгч алга."}</Empty> : (
            <Table head={<><Th>Код</Th><Th>Анги</Th><Th>Элсэгч</Th><Th>Асран хамгаалагч</Th><Th className="text-right">Оноо</Th><Th>Дүн</Th><Th /></>}>
              {applicants.data.map((a) => (
                <tr key={a.id} className={a.status === "withdrawn" ? "bg-slate-50 text-slate-400" : ""}>
                  <Td className="font-mono font-semibold">{a.code}</Td>
                  <Td>{a.grade}</Td>
                  <Td>
                    <span className="font-semibold">{a.child_last_name} {a.child_first_name}</span>
                    <span className="block text-xs text-slate-500">{a.birth_date} · {a.gender === "female" ? "Эм" : "Эр"}{a.current_school && ` · ${a.current_school}`}</span>
                    {a.status === "withdrawn" && <Badge tone="slate">Татгалзсан</Badge>}
                  </Td>
                  <Td>
                    {a.guardian_last_name} {a.guardian_first_name}
                    <span className="block text-xs text-slate-500">{a.phone} · {a.email}</span>
                  </Td>
                  <Td className="text-right tabular-nums">{formatScore(a.score)}</Td>
                  <Td>{a.result ? <Badge tone={RESULT_TONE[a.result]}>{RESULT_LABEL[a.result]}</Badge> : <span className="text-slate-400">—</span>}</Td>
                  <Td className="text-right"><Button variant="ghost" onClick={() => setEditing(a)}>Засах</Button></Td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      )}

      {form && <RoundForm round={form === "new" ? null : form} onClose={() => setForm(null)} onSaved={(r) => { setPicked(r.id); reloadAll(); }} />}
      {editing && <ApplicantEdit key={editing.id} a={editing} onClose={() => setEditing(null)} onSaved={reloadAll} />}
    </div>
  );
}
