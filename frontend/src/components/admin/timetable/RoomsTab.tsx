"use client";

/* Өрөөнүүд: нэр, багтаамж, төрөл. */

import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import type { RoomInput, RoomKind } from "@/lib/types";
import { Badge, Button, Empty, Field, Input, Modal, Select, Spinner, Table, Td, Th } from "@/components/ui";
import { ROOM_KINDS } from "@/components/timetable/format";
import { confirmRemove, FormError, useModalForm } from "./forms";

export function RoomsTab() {
  const q = useFetch(() => api.timetable.rooms.list(), []);
  const form = useModalForm<RoomInput>();
  const save = () => form.submit((id, d) => (id ? api.timetable.rooms.update(id, d) : api.timetable.rooms.create(d)), q.reload);

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => form.open({ name: "", capacity: null, kind: "classroom" })}>+ Өрөө</Button></div>
      {q.loading ? <Spinner /> : !q.data?.length ? <Empty>Өрөө байхгүй.</Empty> : (
        <Table head={<><Th>Нэр</Th><Th>Багтаамж</Th><Th>Төрөл</Th><Th className="text-right">Үйлдэл</Th></>}>
          {q.data.map((r) => (
            <tr key={r.id}>
              <Td className="font-semibold">{r.name}</Td>
              <Td>{r.capacity ?? "—"}</Td>
              <Td><Badge tone="slate">{ROOM_KINDS[r.kind]}</Badge></Td>
              <Td className="text-right space-x-2">
                <Button variant="ghost" onClick={() => form.open({ name: r.name, capacity: r.capacity, kind: r.kind }, r.id)}>Засах</Button>
                <Button variant="danger" onClick={() => confirmRemove(`"${r.name}" өрөөг устгах уу? Хуваарьт өрөөгүй болно.`, () => api.timetable.rooms.remove(r.id), q.reload)}>Устгах</Button>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <Modal open={!!form.editing} title={form.editing?.id ? "Өрөө засах" : "Өрөө нэмэх"} onClose={form.close}
             footer={<><Button variant="ghost" onClick={form.close}>Болих</Button><Button type="submit" form="room-form" disabled={form.busy}>Хадгалах</Button></>}>
        {form.editing && (
          <form id="room-form" onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
            <FormError errors={form.errors} />
            <Field label="Нэр" error={form.errors.name}><Input value={form.editing.data.name} onChange={(e) => form.set({ name: e.target.value })} required /></Field>
            <Field label="Багтаамж" error={form.errors.capacity}><Input type="number" min={1} value={form.editing.data.capacity ?? ""} onChange={(e) => form.set({ capacity: e.target.value ? Number(e.target.value) : null })} /></Field>
            <Field label="Төрөл" error={form.errors.kind}>
              <Select value={form.editing.data.kind} onChange={(e) => form.set({ kind: e.target.value as RoomKind })}>
                {(Object.keys(ROOM_KINDS) as RoomKind[]).map((k) => <option key={k} value={k}>{ROOM_KINDS[k]}</option>)}
              </Select>
            </Field>
          </form>
        )}
      </Modal>
    </div>
  );
}
