"use client";
import { useState } from "react";
import { KeyRound, Save, Trash2, UserPlus } from "lucide-react";
import { useApp, call } from "@/lib/store";
import { Badge, Button, Card, CardHeader, Empty, Field, Input, Modal, PageHeader, Select, Textarea } from "@/components/ui";
import { fmtDate } from "@/lib/logic";
import type { UserRow } from "@/lib/types";

const ROLE_LABEL = { admin: "Pengarah / Admin", leader: "Ketua Unit", member: "Ahli AJK" } as const;

export default function Tetapan() {
  const { data, run, confirm, can } = useApp();
  const s = data.settings;
  const [f, setF] = useState({ ...s });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [userForm, setUserForm] = useState(false);
  const [reset, setReset] = useState<UserRow | null>(null);
  const [pwd, setPwd] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    const e: Record<string, string> = {};
    if (!f.event_name.trim()) e.event_name = "Nama program diperlukan";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.event_date)) e.event_date = "Tarikh tidak sah";
    if (!(Number(f.stale_days) >= 1 && Number(f.stale_days) <= 60)) e.stale_days = "1 hingga 60";
    if (!(Number(f.soon_days) >= 1 && Number(f.soon_days) <= 30)) e.soon_days = "1 hingga 30";
    if (f.wa_template.trim().length < 10) e.wa_template = "Templat terlalu pendek";
    setErr(e); if (Object.keys(e).length) return;
    setBusy(true);
    await run(() => call("PATCH", "/api/settings", f), "Tetapan disimpan");
    setBusy(false);
  }
  async function delUser(u: UserRow) {
    if (!(await confirm({ title: "Padam akaun", message: `Padam akaun "${u.username}"? Ahli itu tidak lagi dapat log masuk.` }))) return;
    await run(() => call("DELETE", `/api/r/users/${u.id}`), "Akaun dipadam");
  }

  return (
    <>
      <PageHeader title="Tetapan" sub="Maklumat program, templat mesej dan akaun pengguna" actions={<Button variant="outline" onClick={() => setPwd(true)}><KeyRound className="size-4" />Tukar Kata Laluan Saya</Button>} />
      {can.admin && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Maklumat Program" />
            <div className="px-5 pb-5 grid gap-4 sm:grid-cols-2">
              <Field label="Nama program *" error={err.event_name} className="sm:col-span-2"><Input value={f.event_name} onChange={(e) => set("event_name", e.target.value)} /></Field>
              <Field label="Tarikh majlis *" error={err.event_date}><Input type="date" value={f.event_date} onChange={(e) => set("event_date", e.target.value)} /></Field>
              <Field label="Pengarah program"><Input value={f.director} onChange={(e) => set("director", e.target.value)} /></Field>
              <Field label="Tempat" className="sm:col-span-2"><Input value={f.venue} onChange={(e) => set("venue", e.target.value)} /></Field>
              <Field label="Tiada kemas kini selepas (hari)" error={err.stale_days} hint="Ahli/unit dianggap perlu susulan"><Input type="number" min={1} max={60} value={f.stale_days} onChange={(e) => set("stale_days", e.target.value)} /></Field>
              <Field label="Hampir tarikh akhir (hari)" error={err.soon_days}><Input type="number" min={1} max={30} value={f.soon_days} onChange={(e) => set("soon_days", e.target.value)} /></Field>
            </div>
          </Card>
          <Card>
            <CardHeader title="Templat Mesej WhatsApp" sub="Pemegang tempat: {nama} {unit} {program} {tugasan} {tarikh}" />
            <div className="px-5 pb-5"><Field label="Templat" error={err.wa_template}><Textarea rows={11} value={f.wa_template} onChange={(e) => set("wa_template", e.target.value)} /></Field></div>
          </Card>
          <div className="lg:col-span-2 flex justify-end"><Button variant="gold" loading={busy} onClick={save}><Save className="size-4" />Simpan Tetapan</Button></div>

          <Card className="lg:col-span-2">
            <CardHeader title="Akaun Pengguna & Peranan" sub="Pengarah: akses penuh · Ketua Unit: urus unit sendiri · Ahli: kemas kini tugasan sendiri" action={<Button size="sm" variant="gold" onClick={() => setUserForm(true)}><UserPlus className="size-4" />Akaun Baharu</Button>} />
            <div className="px-5 pb-5">
              {data.users.length === 0 ? <Empty title="Tiada akaun" /> : (
                <ul className="divide-y divide-navy-100">{data.users.map((u) => (
                  <li key={u.id} className="py-3 flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1"><p className="text-sm font-medium text-navy-900">{u.username} <span className="text-slate-500 font-normal">· {data.members.find((m) => m.id === u.member_id)?.name ?? "—"}</span></p><p className="text-xs text-slate-500">Dicipta {fmtDate(u.created_at)}</p></div>
                    <Badge className={u.role === "admin" ? "bg-gold-50 text-gold-600 ring-gold-100" : "bg-navy-50 text-navy-700 ring-navy-100"}>{ROLE_LABEL[u.role]}</Badge>
                    <Button size="sm" variant="outline" onClick={() => setReset(u)}>Set semula kata laluan</Button>
                    {u.id !== data.me.id && <Button size="sm" variant="ghost" className="text-red-600" aria-label={`Padam akaun ${u.username}`} onClick={() => delUser(u)}><Trash2 className="size-4" /></Button>}
                  </li>))}</ul>)}
            </div>
          </Card>
        </div>
      )}
      {!can.admin && <Card className="p-6 text-sm text-slate-600">Hanya Pengarah boleh mengubah tetapan program dan akaun. Anda boleh menukar kata laluan sendiri.</Card>}
      {userForm && <UserForm onClose={() => setUserForm(false)} />}
      {reset && <ResetForm user={reset} onClose={() => setReset(null)} />}
      {pwd && <PwdForm onClose={() => setPwd(false)} />}
    </>
  );
}

function UserForm({ onClose }: { onClose: () => void }) {
  const { data, run } = useApp();
  const [f, setF] = useState({ username: "", password: "", role: "member", member_id: "" });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const taken = new Set(data.users.map((u) => u.member_id));
  async function save() {
    const e: Record<string, string> = {};
    if (!/^[a-zA-Z0-9._-]{3,30}$/.test(f.username)) e.username = "3-30 aksara (huruf, nombor, . _ -)";
    if (f.password.length < 8) e.password = "Minimum 8 aksara";
    if (!f.member_id) e.member_id = "Pilih ahli";
    setErr(e); if (Object.keys(e).length) return;
    setBusy(true);
    const ok = await run(() => call("POST", "/api/r/users", { ...f, member_id: f.member_id || null }), "Akaun dicipta");
    setBusy(false); if (ok) onClose();
  }
  return (
    <Modal open onClose={onClose} title="Akaun Baharu" footer={<><Button variant="outline" onClick={onClose}>Batal</Button><Button variant="gold" onClick={save} loading={busy}>Cipta</Button></>}>
      <div className="space-y-4">
        <Field label="Ahli *" error={err.member_id}><Select value={f.member_id} onChange={(e) => setF({ ...f, member_id: e.target.value })}><option value="">— Pilih ahli —</option>{data.members.filter((m) => m.active && !taken.has(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>
        <Field label="Peranan"><Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="member">Ahli AJK</option><option value="leader">Ketua Unit</option><option value="admin">Pengarah / Admin</option></Select></Field>
        <Field label="Nama pengguna *" error={err.username}><Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} autoComplete="off" /></Field>
        <Field label="Kata laluan awal *" error={err.password} hint="Beritahu ahli dan minta mereka menukarnya."><Input type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" /></Field>
      </div>
    </Modal>
  );
}
function ResetForm({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const { run } = useApp();
  const [password, setP] = useState(""); const [role, setRole] = useState<string>(user.role); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function save() {
    if (password && password.length < 8) return setErr("Minimum 8 aksara");
    setBusy(true);
    const ok = await run(() => call("PATCH", `/api/r/users/${user.id}`, { role, ...(password ? { password } : {}) }), "Akaun dikemas kini");
    setBusy(false); if (ok) onClose();
  }
  return (
    <Modal open onClose={onClose} title={`Kemas kini akaun ${user.username}`} footer={<><Button variant="outline" onClick={onClose}>Batal</Button><Button variant="gold" onClick={save} loading={busy}>Simpan</Button></>}>
      <div className="space-y-4">
        <Field label="Peranan"><Select value={role} onChange={(e) => setRole(e.target.value)}><option value="member">Ahli AJK</option><option value="leader">Ketua Unit</option><option value="admin">Pengarah / Admin</option></Select></Field>
        <Field label="Kata laluan baharu (biarkan kosong jika tidak tukar)" error={err}><Input type="text" value={password} onChange={(e) => setP(e.target.value)} autoComplete="new-password" /></Field>
      </div>
    </Modal>
  );
}
function PwdForm({ onClose }: { onClose: () => void }) {
  const { run } = useApp();
  const [f, setF] = useState({ current: "", next: "", again: "" }); const [err, setErr] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false);
  async function save() {
    const e: Record<string, string> = {};
    if (!f.current) e.current = "Diperlukan";
    if (f.next.length < 8) e.next = "Minimum 8 aksara";
    if (f.next !== f.again) e.again = "Kata laluan tidak sepadan";
    setErr(e); if (Object.keys(e).length) return;
    setBusy(true);
    const ok = await run(() => call("POST", "/api/auth/password", { current: f.current, next: f.next }), "Kata laluan ditukar");
    setBusy(false); if (ok) onClose();
  }
  return (
    <Modal open onClose={onClose} title="Tukar Kata Laluan" footer={<><Button variant="outline" onClick={onClose}>Batal</Button><Button variant="gold" onClick={save} loading={busy}>Simpan</Button></>}>
      <div className="space-y-4">
        <Field label="Kata laluan semasa" error={err.current}><Input type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} /></Field>
        <Field label="Kata laluan baharu" error={err.next}><Input type="password" autoComplete="new-password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /></Field>
        <Field label="Ulang kata laluan baharu" error={err.again}><Input type="password" autoComplete="new-password" value={f.again} onChange={(e) => setF({ ...f, again: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
