"use client";

/* Хэрэглэгч удирдах (зөвхөн superuser): жагсаалт, нэмэх, засах, устгах, хэсэг тус бүрийн эрх (эрхгүй / харах / засах). */

import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFetch } from "@/lib/useFetch";
import { levelOf, setLevel, type Level } from "@/lib/permissions";
import type { User, UserInput } from "@/lib/types";
import { Badge, Button, Empty, Field, Input, Modal, Spinner, Table, Td, Th } from "@/components/ui";
import { DeleteLabel, EditLabel } from "@/components/admin/ActionLabel";

const LEVELS: { level: Level | null; label: string }[] = [
  { level: null, label: "Эрхгүй" }, { level: "view", label: "Харах" }, { level: "edit", label: "Засах" },
];

const empty = (): UserInput => ({ username: "", password: "", full_name: "", email: "", is_active: true, is_superuser: false, roles: [] });

export default function UsersPage() {
  const { user: me } = useAuth();
  const usersQ = useFetch(() => api.users.list(), []);
  const rolesQ = useFetch(() => api.roles(), []);
  const [editing, setEditing] = useState<{ id?: number; data: UserInput } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (me && !me.is_superuser) return <p className="text-sm text-slate-600">Энэ хуудас зөвхөн superuser-т нээлттэй.</p>;

  const set = (patch: Partial<UserInput>) => editing && setEditing({ ...editing, data: { ...editing.data, ...patch } });

  function openEdit(u: User) {
    setErrors({});
    setEditing({ id: u.id, data: { username: u.username, password: "", full_name: u.full_name, email: u.email, is_active: u.is_active ?? true, is_superuser: u.is_superuser, roles: u.roles } });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true); setErrors({});
    try {
      const d = { ...editing.data };
      if (editing.id && !d.password) delete d.password;
      if (editing.id) await api.users.update(editing.id, d);
      else await api.users.create(d);
      setEditing(null);
      usersQ.reload();
    } catch (err) {
      setErrors(err instanceof ApiError ? err.fieldErrors : { non_field_errors: "Хадгалж чадсангүй." });
    } finally { setBusy(false); }
  }

  async function remove(u: User) {
    if (!confirm(`"${u.username}" хэрэглэгчийг устгах уу?`)) return;
    try { await api.users.remove(u.id); usersQ.reload(); }
    catch (err) { alert(err instanceof ApiError ? Object.values(err.fieldErrors).join(" ") : "Устгаж чадсангүй."); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy">Хэрэглэгчид</h1>
          <p className="text-sm text-slate-600">Админ дашбоардад нэвтрэх хэрэглэгчид ба тэдний эрх.</p>
        </div>
        <Button onClick={() => { setErrors({}); setEditing({ data: empty() }); }}>+ Хэрэглэгч нэмэх</Button>
      </div>

      {usersQ.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{usersQ.error}</p>}
      {usersQ.loading ? <Spinner /> : !usersQ.data?.length ? <Empty>Хэрэглэгч байхгүй.</Empty> : (
        <Table head={<><Th>Нэвтрэх нэр</Th><Th>Нэр</Th><Th>Эрх</Th><Th>Төлөв</Th><Th className="text-right">Үйлдэл</Th></>}>
          {usersQ.data.map((u) => (
            <tr key={u.id} className="border-t border-slate-100">
              <Td className="font-semibold">{u.username}</Td>
              <Td>{u.full_name}<div className="text-xs text-slate-500">{u.email}</div></Td>
              <Td>
                <div className="flex min-w-48 flex-wrap gap-1 whitespace-nowrap">
                  {u.is_superuser && <Badge tone="gold">superuser</Badge>}
                  {!u.is_superuser && (rolesQ.data ?? []).map((sec) => {
                    const lv = levelOf(u.roles, sec.code);
                    return lv && <Badge key={sec.code} tone={lv === "edit" ? "navy" : "slate"}>{sec.name}{lv === "view" && " · харах"}</Badge>;
                  })}
                </div>
              </Td>
              <Td>{u.is_active ? <Badge tone="green">идэвхтэй</Badge> : <Badge tone="slate">идэвхгүй</Badge>}</Td>
              <Td className="whitespace-nowrap text-right space-x-2">
                <Button variant="ghost" onClick={() => openEdit(u)}><EditLabel /></Button>
                {u.id !== me?.id && <Button variant="danger" onClick={() => remove(u)}><DeleteLabel /></Button>}
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={!!editing} title={editing?.id ? "Хэрэглэгч засах" : "Хэрэглэгч нэмэх"} onClose={() => setEditing(null)}
             footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Болих</Button><Button type="submit" form="user-form" disabled={busy}>Хадгалах</Button></>}>
        {editing && (
          <form id="user-form" onSubmit={save} className="space-y-4">
            {errors.non_field_errors && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.non_field_errors}</p>}
            <Field label="Нэвтрэх нэр" error={errors.username}><Input value={editing.data.username} onChange={(e) => set({ username: e.target.value })} required /></Field>
            <Field label={editing.id ? "Шинэ нууц үг (хоосон бол өөрчлөхгүй)" : "Нууц үг"} error={errors.password} hint="Хамгийн багадаа 6 тэмдэгт">
              <Input type="password" value={editing.data.password ?? ""} onChange={(e) => set({ password: e.target.value })} required={!editing.id} />
            </Field>
            <Field label="Бүтэн нэр" error={errors.full_name}><Input value={editing.data.full_name} onChange={(e) => set({ full_name: e.target.value })} /></Field>
            <Field label="И-мэйл" error={errors.email}><Input type="email" value={editing.data.email} onChange={(e) => set({ email: e.target.value })} /></Field>
            <div className="flex gap-6 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={editing.data.is_superuser} onChange={(e) => set({ is_superuser: e.target.checked })} />Superuser</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={editing.data.is_active} onChange={(e) => set({ is_active: e.target.checked })} />Идэвхтэй</label>
            </div>
            <fieldset>
              <legend className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">Хэсгийн эрх</legend>
              {editing.data.is_superuser ? (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">Superuser бүх хэсгийг удирдах, хэрэглэгч нэмэх эрхтэй.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                      <tr><th className="px-3 py-2 text-left">Хэсэг</th>{LEVELS.map((c) => <th key={c.label} className="w-20 px-2 py-2 text-center">{c.label}</th>)}</tr>
                    </thead>
                    <tbody>
                      {(rolesQ.data ?? []).map((sec) => (
                        <tr key={sec.code} className="border-t border-slate-100">
                          <td className="px-3 py-1.5 font-medium text-slate-800">{sec.name}</td>
                          {LEVELS.map((c) => (
                            <td key={c.label} className="text-center">
                              <input type="radio" name={`perm-${sec.code}`} aria-label={`${sec.name} — ${c.label}`} className="h-4 w-4 accent-navy"
                                     checked={levelOf(editing.data.roles, sec.code) === c.level}
                                     onChange={() => set({ roles: setLevel(editing.data.roles, sec.code, c.level) })} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-1 text-xs text-slate-500">Засах эрх харах эрхийг агуулна.</p>
              {errors.roles && <p className="mt-1 text-xs font-medium text-red-600">{errors.roles}</p>}
            </fieldset>
          </form>
        )}
      </Modal>
    </div>
  );
}
