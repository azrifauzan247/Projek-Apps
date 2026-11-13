"use client";
import { useMemo, useState } from "react";
import { useApp, call } from "@/lib/store";
import { Button, Field, Input, Modal, Select, Textarea } from "./ui";
import { memberName, PRIORITY_LABEL } from "@/lib/logic";
import type { Priority, WatchItem } from "@/lib/types";

export function ownerLabel(d: { members: { name: string; position: string }[] }, o: WatchItem["owner"]) {
  const dir = d.members.find((m) => m.position === "Pengarah")?.name ?? "Pengarah";
  const dep = d.members.find((m) => m.position === "Timbalan Pengarah")?.name ?? "Timbalan Pengarah";
  return o === "Pengarah" ? dir : o === "Timbalan Pengarah" ? dep : `${dir} & ${dep}`;
}

export function WatchForm({ value, onClose }: { value: Partial<WatchItem>; onClose: () => void }) {
  const { data, run } = useApp();
  const [f, setF] = useState({
    title: value.title ?? "", notes: value.notes ?? "", task_id: value.task_id ? String(value.task_id) : "",
    owner: (value.owner ?? "Berdua") as WatchItem["owner"], due_date: value.due_date ?? "", priority: (value.priority ?? "Medium") as Priority,
  });
  const [filter, setFilter] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const tasks = useMemo(() => {
    const t = filter.trim().toLowerCase();
    const list = data.tasks.filter((x) => String(x.id) === f.task_id || !t || `${x.title} ${memberName(data, x.member_id)}`.toLowerCase().includes(t));
    return list.slice(0, 60);
  }, [data, filter, f.task_id]);

  async function save() {
    const e: Record<string, string> = {};
    if (!f.title.trim()) e.title = "Tajuk pantauan diperlukan";
    setErr(e); if (Object.keys(e).length) return;
    setBusy(true);
    const body = { ...f, task_id: f.task_id || null, due_date: f.due_date || null };
    const ok = await run(() => value.id ? call("PATCH", `/api/r/watch/${value.id}`, body) : call("POST", "/api/r/watch", body), "Pantauan disimpan");
    setBusy(false); if (ok) onClose();
  }
  return (
    <Modal open onClose={onClose} wide title={value.id ? "Sunting Pantauan" : "Pantauan Baharu"}
      footer={<><Button variant="outline" onClick={onClose}>Batal</Button><Button variant="gold" onClick={save} loading={busy}>Simpan</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Apa yang perlu dipantau *" error={err.title} className="sm:col-span-2"><Input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="cth. Pastikan perasmi sahkan kehadiran" /></Field>
        <Field label="Catatan (takenote)" className="sm:col-span-2"><Textarea rows={4} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Apa yang perlu diingat, siapa dihubungi, keputusan mesyuarat…" /></Field>
        <Field label="Siapa pantau"><Select value={f.owner} onChange={(e) => set("owner", e.target.value as WatchItem["owner"])}>{(["Pengarah", "Timbalan Pengarah", "Berdua"] as const).map((o) => <option key={o} value={o}>{o === "Berdua" ? "Berdua" : o} · {ownerLabel(data, o)}</option>)}</Select></Field>
        <Field label="Keutamaan"><Select value={f.priority} onChange={(e) => set("priority", e.target.value as Priority)}>{(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</Select></Field>
        <Field label="Tarikh semak" hint="Pada tarikh ini item naik ke 'Perlu perhatian'"><Input type="date" value={f.due_date} onChange={(e) => set("due_date", e.target.value)} /></Field>
        <Field label="Pautkan tugasan (pilihan)" hint="Status dan kemajuan tugasan dipaparkan bersama">
          <Input type="search" placeholder="Cari tugasan atau nama…" value={filter} onChange={(e) => setFilter(e.target.value)} className="mb-2" />
          <Select value={f.task_id} onChange={(e) => set("task_id", e.target.value)}><option value="">— Tiada —</option>{tasks.map((t) => <option key={t.id} value={t.id}>{t.title} · {memberName(data, t.member_id)}</option>)}</Select>
        </Field>
      </div>
    </Modal>
  );
}
