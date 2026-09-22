"use client";

/* Хэрэглэгч удирдах (зөвхөн superuser): жагсаалт, нэмэх, засах, устгах, эрхийн бүлэг. */

import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useFetch } from "@/lib/useFetch";
import type { RoleCode, User, UserInput } from "@/lib/types";
import { Badge, Button, Empty, Field, Input, Modal, Spinner, Table, Td, Th } from "@/components/ui";

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

  const toggleRole = (code: RoleCode) => editing && set({ roles: editing.data.roles.includes(code) ? editing.data.roles.filter((r) => r !== code) : [...editing.data.roles, code] });

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
              <Td className="space-x-1">
                {u.is_superuser && <Badge tone="gold">superuser</Badge>}
                {u.roles.map((r) => <Badge key={r}>{rolesQ.data?.find((x) => x.code === r)?.name ?? r}</Badge>)}
              </Td>
              <Td>{u.is_active ? <Badge tone="green">идэвхтэй</Badge> : <Badge tone="slate">идэвхгүй</Badge>}</Td>
              <Td className="text-right space-x-2">
                <Button variant="ghost" onClick={() => openEdit(u)}>Засах</Button>
                {u.id !== me?.id && <Button variant="danger" onClick={() => remove(u)}>Устгах</Button>}
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
            <Field label="Эрхийн бүлэг" error={errors.roles}>
              <div className="flex flex-wrap gap-3">
                {(rolesQ.data ?? []).map((r) => (
                  <label key={r.code} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={editing.data.roles.includes(r.code)} onChange={() => toggleRole(r.code)} />{r.name}
                  </label>
                ))}
              </div>
            </Field>
            <div className="flex gap-6 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={editing.data.is_superuser} onChange={(e) => set({ is_superuser: e.target.checked })} />Superuser</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={editing.data.is_active} onChange={(e) => set({ is_active: e.target.checked })} />Идэвхтэй</label>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
