"use client";
import { useMemo, useState } from "react";
import { Copy, ExternalLink, MessageCircle, TriangleAlert } from "lucide-react";
import { useApp, call } from "@/lib/store";
import { Button, Field, Input, Modal, Select, Textarea } from "./ui";
import { addDays, buildWhatsApp, effStatus, PRIORITY_ORDER, todayStr, waNumber } from "@/lib/logic";
import type { Followup, Member } from "@/lib/types";

export function nowLocalInput(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function FollowupForm({ value, onClose }: { value: Partial<Followup> & { member_id?: number }; onClose: () => void }) {
  const { data, run } = useApp();
  const [f, setF] = useState({
    member_id: String(value.member_id ?? ""), task_id: value.task_id ? String(value.task_id) : "",
    contacted_at: value.contacted_at ? value.contacted_at.slice(0, 16) : nowLocalInput(), method: value.method ?? "WhatsApp",
    summary: value.summary ?? "", responded: value.responded ?? 0, response: value.response ?? "", action_required: value.action_required ?? "",
    next_followup: value.next_followup ?? "",
  });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const tasks = data.tasks.filter((t) => String(t.member_id) === f.member_id);
  async function save() {
    const e: Record<string, string> = {};
    if (!f.member_id) e.member_id = "Pilih ahli yang dihubungi";
    if (!f.contacted_at) e.contacted_at = "Tarikh & masa diperlukan";
    if (!f.summary.trim()) e.summary = "Ringkasan perbincangan diperlukan";
    if (f.responded && !f.response.trim()) e.response = "Nyatakan respons yang diterima";
    if (f.next_followup && f.next_followup < f.contacted_at.slice(0, 10)) e.next_followup = "Tarikh susulan mesti selepas tarikh hubungan";
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const body = { ...f, member_id: Number(f.member_id), task_id: f.task_id || null, next_followup: f.next_followup || null };
    const ok = await run(() => value.id ? call("PATCH", `/api/r/followups/${value.id}`, body) : call("POST", "/api/r/followups", body), "Susulan direkodkan");
    setBusy(false);
    if (ok) onClose();
  }
  return (
    <Modal open onClose={onClose} wide title={value.id ? "Sunting Rekod Susulan" : "Rekod Susulan"} footer={<><Button variant="outline" onClick={onClose}>Batal</Button><Button variant="gold" onClick={save} loading={busy}>Simpan</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Orang dihubungi *" error={err.member_id}><Select value={f.member_id} onChange={(e) => setF((p) => ({ ...p, member_id: e.target.value, task_id: "" }))}><option value="">— Pilih ahli —</option>{data.members.filter((m) => m.active || String(m.id) === f.member_id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>
        <Field label="Berkaitan tugasan"><Select value={f.task_id} onChange={(e) => set("task_id", e.target.value)}><option value="">— Umum / semua tugasan —</option>{tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</Select></Field>
        <Field label="Tarikh & masa *" error={err.contacted_at}><Input type="datetime-local" value={f.contacted_at} onChange={(e) => set("contacted_at", e.target.value)} /></Field>
        <Field label="Kaedah komunikasi"><Select value={f.method} onChange={(e) => set("method", e.target.value)}>{["WhatsApp", "Panggilan", "Bersemuka", "Mesyuarat", "Lain-lain"].map((m) => <option key={m}>{m}</option>)}</Select></Field>
        <Field label="Ringkasan perbincangan *" error={err.summary} className="sm:col-span-2"><Textarea value={f.summary} onChange={(e) => set("summary", e.target.value)} /></Field>
        <label className="sm:col-span-2 flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="size-4 accent-[#c9a227]" checked={!!f.responded} onChange={(e) => set("responded", e.target.checked ? 1 : 0)} />Ahli telah membalas / memberi respons</label>
        {!!f.responded && <Field label="Respons diterima *" error={err.response} className="sm:col-span-2"><Textarea value={f.response} onChange={(e) => set("response", e.target.value)} /></Field>}
        <Field label="Tindakan diperlukan" className="sm:col-span-2"><Textarea value={f.action_required} onChange={(e) => set("action_required", e.target.value)} /></Field>
        <Field label="Tarikh susulan seterusnya" error={err.next_followup}>
          <Input type="date" value={f.next_followup} onChange={(e) => set("next_followup", e.target.value)} />
          <div className="flex gap-1.5 mt-1.5">{[1, 3, 7].map((n) => <button type="button" key={n} onClick={() => set("next_followup", addDays(todayStr(), n))} className="text-[11px] rounded-full bg-navy-50 px-2.5 py-1 hover:bg-gold-100 cursor-pointer">+{n} hari</button>)}</div>
        </Field>
      </div>
    </Modal>
  );
}

export function WhatsAppModal({ member, onClose, onSent }: { member: Member; onClose: () => void; onSent: (taskId: number | null, message: string) => void }) {
  const { data, toast, can } = useApp();
  const today = todayStr();
  const open = useMemo(() => data.tasks.filter((t) => t.member_id === member.id && t.status !== "done").sort((a, b) => (effStatus(a, today) === "overdue" ? 0 : 1) - (effStatus(b, today) === "overdue" ? 0 : 1) || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || (a.deadline ?? "9").localeCompare(b.deadline ?? "9")), [data.tasks, member.id, today]);
  const [taskId, setTaskId] = useState<string>(open[0] ? String(open[0].id) : "");
  const [msg, setMsg] = useState(() => buildWhatsApp(data, member, open[0], open));
  const num = waNumber(member.phone);
  const pick = (id: string) => { setTaskId(id); setMsg(buildWhatsApp(data, member, open.find((t) => String(t.id) === id), open)); };
  function send() {
    if (!num) return;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
    onSent(taskId ? Number(taskId) : null, msg);
  }
  async function copy() {
    try { await navigator.clipboard.writeText(msg); toast("ok", "Mesej disalin"); } catch { toast("err", "Tidak dapat menyalin. Pilih teks dan salin secara manual."); }
  }
  return (
    <Modal open onClose={onClose} wide title={`Follow-up ${member.name}`}
      footer={<><Button variant="outline" onClick={copy}><Copy className="size-4" />Salin</Button><Button variant="whatsapp" disabled={!num || !msg.trim()} onClick={send}><ExternalLink className="size-4" />Buka WhatsApp</Button></>}>
      {!num && (
        <div className="mb-4 flex gap-2.5 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800"><TriangleAlert className="size-5 shrink-0" /><p>No. telefon {member.name} belum diisi, jadi WhatsApp tidak boleh dibuka.{can.manage ? " Tambah di Direktori AJK." : " Minta Pengarah melengkapkannya."} Anda masih boleh menyalin mesej ini.</p></div>
      )}
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Penerima"><Input readOnly value={`${member.name}${member.phone ? ` · ${member.phone}` : ""}`} /></Field>
          <Field label="Tugasan yang disebut"><Select value={taskId} onChange={(e) => pick(e.target.value)}><option value="">— Umum —</option>{open.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</Select></Field>
        </div>
        <Field label="Mesej (boleh disunting sebelum dihantar)" hint="Mesej dibuka dalam WhatsApp; anda yang menekan hantar di sana."><Textarea rows={7} value={msg} onChange={(e) => setMsg(e.target.value)} className="font-[inherit] leading-relaxed" /></Field>
        <button onClick={() => setMsg(buildWhatsApp(data, member, open.find((t) => String(t.id) === taskId), open))} className="text-xs text-gold-600 font-semibold cursor-pointer inline-flex items-center gap-1"><MessageCircle className="size-3.5" />Set semula mesej asal</button>
      </div>
    </Modal>
  );
}
