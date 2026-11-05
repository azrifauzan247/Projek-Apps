"use client";
import { useRef, useState } from "react";
import { Download, Paperclip, Trash2, Upload, History } from "lucide-react";
import { useApp, call } from "@/lib/store";
import { Button, Field, Input, Modal, Select, Textarea, Progress } from "./ui";
import { fmtDate, fmtDateTime, STATUS_LABEL, PRIORITY_LABEL } from "@/lib/logic";
import type { Priority, Status, Task } from "@/lib/types";

export function TaskForm({ value, onClose }: { value: Partial<Task>; onClose: () => void }) {
  const { data, run, toast, can } = useApp();
  const isNew = !value.id;
  const memberOnly = data.me.role === "member";
  const leader = data.me.role === "leader";
  const [f, setF] = useState({
    title: value.title ?? "", description: value.description ?? "",
    unit_id: String(value.unit_id ?? (leader ? data.me.unitId : "") ?? ""), member_id: value.member_id ? String(value.member_id) : "",
    priority: (value.priority ?? "Medium") as Priority, start_date: value.start_date ?? "", deadline: value.deadline ?? "",
    status: (value.status ?? "pending") as Status, progress: value.progress ?? 0, notes: value.notes ?? "",
  });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const files = data.attachments.filter((a) => a.task_id === value.id);
  const logs = data.taskLog.filter((l) => l.task_id === value.id).slice(-6).reverse();
  const unitMembers = data.members.filter((m) => m.active && (!f.unit_id || String(m.unit_id) === f.unit_id));

  function setStatus(s: Status) { setF((p) => ({ ...p, status: s, progress: s === "done" ? 100 : s === "pending" ? 0 : p.progress > 0 && p.progress < 100 ? p.progress : 50 })); }
  function setProgress(n: number) { setF((p) => ({ ...p, progress: n, status: n >= 100 ? "done" : n > 0 ? "ongoing" : p.status === "done" ? "pending" : p.status })); }

  async function save() {
    const e: Record<string, string> = {};
    if (!f.title.trim()) e.title = "Tajuk tugasan diperlukan";
    if (f.start_date && f.deadline && f.deadline < f.start_date) e.deadline = "Tarikh akhir mesti sama atau selepas tarikh mula";
    if (f.member_id && f.unit_id && !unitMembers.some((m) => String(m.id) === f.member_id)) e.member_id = "Pilih ahli dalam unit ini";
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const body = { ...f, unit_id: f.unit_id || null, member_id: f.member_id || null, start_date: f.start_date || null, deadline: f.deadline || null };
    const ok = await run(() => isNew ? call("POST", "/api/r/tasks", body) : call("PATCH", `/api/r/tasks/${value.id}`, body), isNew ? "Tugasan dicipta" : "Tugasan dikemas kini");
    setBusy(false);
    if (ok) onClose();
  }
  async function upload(fl: FileList | null) {
    if (!fl?.[0] || !value.id) return;
    if (fl[0].size > 10 * 1024 * 1024) return toast("err", "Fail melebihi had 10MB.");
    setUploading(true);
    const fd = new FormData(); fd.append("file", fl[0]);
    await run(() => call("POST", `/api/tasks/${value.id}/attachments`, fd), "Lampiran dimuat naik");
    setUploading(false); if (file.current) file.current.value = "";
  }
  async function delFile(id: number) {
    await run(() => call("DELETE", `/api/attachments/${id}`), "Lampiran dipadam");
  }
  const lock = memberOnly;

  return (
    <Modal open onClose={onClose} wide title={isNew ? "Tugasan Baharu" : "Butiran Tugasan"}
      footer={<><Button variant="outline" onClick={onClose}>Batal</Button><Button variant="gold" onClick={save} loading={busy}>Simpan</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tajuk tugasan *" error={err.title} className="sm:col-span-2"><Input disabled={lock} value={f.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Huraian" className="sm:col-span-2"><Textarea disabled={lock} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="Unit jawatankuasa"><Select disabled={lock || leader} value={f.unit_id} onChange={(e) => setF((p) => ({ ...p, unit_id: e.target.value, member_id: "" }))}><option value="">— Pilih unit —</option>{data.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>
        <Field label="Orang bertanggungjawab" error={err.member_id}><Select disabled={lock} value={f.member_id} onChange={(e) => set("member_id", e.target.value)}><option value="">— Belum ditugaskan —</option>{unitMembers.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.position})</option>)}</Select></Field>
        <Field label="Keutamaan"><Select disabled={lock} value={f.priority} onChange={(e) => set("priority", e.target.value as Priority)}>{(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]} ({p})</option>)}</Select></Field>
        <Field label="Status"><Select value={f.status} onChange={(e) => setStatus(e.target.value as Status)}><option value="pending">{STATUS_LABEL.pending}</option><option value="ongoing">{STATUS_LABEL.ongoing}</option><option value="done">{STATUS_LABEL.done}</option></Select></Field>
        <Field label="Tarikh mula"><Input disabled={lock} type="date" value={f.start_date} onChange={(e) => set("start_date", e.target.value)} /></Field>
        <Field label="Tarikh akhir" error={err.deadline}><Input disabled={lock} type="date" value={f.deadline} onChange={(e) => set("deadline", e.target.value)} /></Field>
        <Field label={`Kemajuan: ${f.progress}%`} className="sm:col-span-2">
          <input type="range" min={0} max={100} step={5} value={f.progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-full accent-[#c9a227]" aria-label="Peratus kemajuan" />
          <Progress value={f.progress} showLabel={false} className="mt-1" />
        </Field>
        <Field label="Nota & ulasan" className="sm:col-span-2"><Textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Kemas kini, halangan atau keperluan…" /></Field>
      </div>

      {!isNew && (
        <div className="mt-5 pt-5 border-t border-navy-100 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2"><p className="text-xs font-semibold text-navy-800 flex items-center gap-1.5"><Paperclip className="size-3.5" />Lampiran ({files.length})</p>
              <div><input ref={file} type="file" className="hidden" onChange={(e) => upload(e.target.files)} /><Button size="sm" variant="outline" loading={uploading} onClick={() => file.current?.click()}><Upload className="size-3.5" />Muat naik (maks 10MB)</Button></div></div>
            {files.length === 0 ? <p className="text-xs text-slate-500">Tiada lampiran.</p> : (
              <ul className="space-y-1.5">{files.map((a) => (
                <li key={a.id} className="flex items-center gap-2 rounded-lg bg-navy-50 px-3 py-2 text-sm">
                  <span className="truncate flex-1">{a.name}</span><span className="text-[11px] text-slate-500">{(a.size / 1024).toFixed(0)} KB · {fmtDate(a.created_at)}</span>
                  <a href={`/api/attachments/${a.id}`} aria-label={`Muat turun ${a.name}`} className="p-1.5 rounded hover:bg-white"><Download className="size-4" /></a>
                  <button onClick={() => delFile(a.id)} aria-label={`Padam ${a.name}`} className="p-1.5 rounded hover:bg-white text-red-600 cursor-pointer"><Trash2 className="size-4" /></button>
                </li>))}</ul>)}
          </div>
          <div>
            <p className="text-xs font-semibold text-navy-800 flex items-center gap-1.5 mb-2"><History className="size-3.5" />Sejarah kemajuan</p>
            {logs.length === 0 ? <p className="text-xs text-slate-500">Belum ada rekod.</p> : <ul className="text-xs text-slate-600 space-y-1">{logs.map((l, i) => <li key={i}>{fmtDateTime(l.at)} — {STATUS_LABEL[l.status === "done" ? "done" : l.status]} ({l.progress}%) oleh {l.by_user}</li>)}</ul>}
            <p className="text-[11px] text-slate-400 mt-2">Kemas kini terakhir: {fmtDateTime(value.updated_at)}</p>
          </div>
        </div>
      )}
      {!can.editTasks && !isNew && <p className="mt-3 text-[11px] text-slate-500">Sebagai ahli AJK, anda boleh mengemas kini status, kemajuan, nota dan lampiran tugasan anda sahaja.</p>}
    </Modal>
  );
}
