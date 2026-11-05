"use client";
import { useMemo, useState } from "react";
import { Crown, Pencil, Phone, Plus, Search, Trash2, UserPlus, UserX, FolderPlus, ShieldCheck } from "lucide-react";
import { useApp, call } from "@/lib/store";
import { Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, Select, Textarea, cn } from "@/components/ui";
import { stats } from "@/lib/logic";
import type { Member, Unit } from "@/lib/types";

const POSITIONS = ["Ketua", "Ahli", "Pengarah", "Timbalan Pengarah", "Penasihat", "Setiausaha", "Bendahari"];
const PHONE_RE = /^(\+?[0-9][0-9 \-]{7,17})?$/;

export default function Direktori() {
  const { data, run, confirm, can } = useApp();
  const [q, setQ] = useState("");
  const [unitF, setUnitF] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [edit, setEdit] = useState<Partial<Member> | null>(null);
  const [unitEdit, setUnitEdit] = useState<Partial<Unit> | null>(null);

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.units
      .filter((u) => !unitF || String(u.id) === unitF)
      .map((u) => ({ unit: u, members: data.members.filter((m) => m.unit_id === u.id && (showInactive || m.active) && (!term || [m.name, m.position, m.phone, m.extra_resp].some((x) => x.toLowerCase().includes(term)))) }))
      .filter((g) => !term || g.members.length > 0);
  }, [data, q, unitF, showInactive]);
  const orphans = data.members.filter((m) => !m.unit_id && (showInactive || m.active) && !unitF);
  const total = data.members.filter((m) => m.active).length;

  async function removeMember(m: Member) {
    if (!(await confirm({ title: "Padam ahli AJK", message: `Padam ${m.name}? Tugasan yang ditugaskan kepadanya akan menjadi "belum ditugaskan". Jika sekadar tidak aktif, gunakan pilihan "tidak aktif" pada borang sunting.` }))) return;
    await run(() => call("DELETE", `/api/r/members/${m.id}`), `${m.name} dipadam`);
  }
  async function removeUnit(u: Unit) {
    if (!(await confirm({ title: "Padam unit", message: `Padam unit "${u.name}"? Hanya unit kosong (tanpa ahli/tugasan) boleh dipadam.` }))) return;
    await run(() => call("DELETE", `/api/r/units/${u.id}`), "Unit dipadam");
  }
  const rowProps = { onEdit: setEdit, onDelete: removeMember };

  return (
    <>
      <PageHeader title="Direktori AJK" sub={`${total} ahli aktif dalam ${data.units.length} unit`}
        actions={can.manage && <><Button variant="outline" onClick={() => setUnitEdit({})}><FolderPlus className="size-4" />Unit Baharu</Button><Button variant="gold" onClick={() => setEdit({ active: 1, position: "Ahli", unit_id: unitF ? Number(unitF) : null })}><UserPlus className="size-4" />Tambah Ahli</Button></>} />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1"><Search className="size-4 absolute left-3.5 top-3.5 text-slate-400" /><Input type="search" className="pl-10" placeholder="Cari nama, jawatan atau no. telefon…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari ahli" /></div>
        <Select className="sm:w-64" value={unitF} onChange={(e) => setUnitF(e.target.value)} aria-label="Tapis unit"><option value="">Semua unit</option>{data.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
        {can.manage && <label className="flex items-center gap-2 text-sm text-slate-600 px-1 cursor-pointer"><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="size-4 accent-[#c9a227]" />Tunjuk tidak aktif</label>}
      </div>

      {groups.length === 0 && orphans.length === 0 && <Card><Empty title="Tiada ahli dijumpai" sub="Cuba kata kunci atau tapisan lain." /></Card>}
      <div className="grid gap-5 xl:grid-cols-2">
        {groups.map(({ unit, members }) => {
          const st = stats(data.tasks.filter((t) => t.unit_id === unit.id));
          return (
            <Card key={unit.id}>
              <div className="flex items-center gap-3 px-5 py-4 border-b border-navy-100">
                <div className="size-9 rounded-xl bg-navy-900 text-gold-400 grid place-items-center font-bold text-sm">{unit.sort}</div>
                <div className="min-w-0 flex-1"><h3 className="font-semibold text-navy-900 leading-tight">{unit.name}</h3><p className="text-xs text-slate-500">{members.length} ahli · {st.total} tugasan</p></div>
                {can.manage && <div className="flex"><button aria-label={`Sunting unit ${unit.name}`} onClick={() => setUnitEdit(unit)} className="p-2 rounded-lg hover:bg-navy-50 text-slate-500 cursor-pointer"><Pencil className="size-4" /></button><button aria-label={`Padam unit ${unit.name}`} onClick={() => removeUnit(unit)} className="p-2 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 cursor-pointer"><Trash2 className="size-4" /></button></div>}
              </div>
              <ul className="divide-y divide-navy-100">
                {members.length === 0 && <li className="px-5 py-4 text-sm text-slate-500">Tiada ahli.</li>}
                {members.map((m) => <MemberRow key={m.id} m={m} {...rowProps} />)}
              </ul>
            </Card>
          );
        })}
        {orphans.length > 0 && (
          <Card><div className="px-5 py-4 border-b border-navy-100"><h3 className="font-semibold text-navy-900">Tanpa unit</h3></div><ul className="divide-y divide-navy-100">{orphans.map((m) => <MemberRow key={m.id} m={m} {...rowProps} />)}</ul></Card>
        )}
      </div>

      {edit && <MemberForm key={edit.id ?? "baru"} value={edit} onClose={() => setEdit(null)} />}
      {unitEdit && <UnitForm key={unitEdit.id ?? "baru"} value={unitEdit} onClose={() => setUnitEdit(null)} />}
    </>
  );
}

function MemberRow({ m, onEdit, onDelete }: { m: Member; onEdit: (m: Member) => void; onDelete: (m: Member) => void }) {
  const { data, can } = useApp();
  const isLead = /^ketua|^pengarah$/i.test(m.position);
  const open = data.tasks.filter((t) => t.member_id === m.id && t.status !== "done").length;
  const account = data.users.find((u) => u.member_id === m.id);
  return (
    <li className={cn("px-5 py-3.5 flex items-center gap-3", !m.active && "opacity-55")}>
      <div className={cn("size-10 rounded-full grid place-items-center font-bold text-sm shrink-0", isLead ? "bg-gold-100 text-gold-600" : "bg-navy-50 text-navy-700")}>{isLead ? <Crown className="size-4" /> : m.name.replace(/^(Ustaz|Ustazah|Teacher)\s+/i, "").charAt(0)}</div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-navy-900 truncate flex items-center gap-1.5">{m.name}{account && <span title={`Akaun log masuk: ${account.username}`}><ShieldCheck className="size-3.5 text-emerald-500" /></span>}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
          <Badge className={isLead ? "bg-gold-50 text-gold-600 ring-gold-100" : "bg-slate-100 text-slate-600 ring-slate-200"}>{m.position}</Badge>
          {m.extra_resp && <span className="text-xs text-slate-500 truncate max-w-[16rem]">+ {m.extra_resp}</span>}
          {!m.active && <Badge className="bg-slate-100 text-slate-500 ring-slate-200">Tidak aktif</Badge>}
        </div>
        <p className="text-xs mt-1 text-slate-500 flex flex-wrap items-center gap-x-1.5">
          {m.phone ? <a href={`tel:${m.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 hover:text-navy-900"><Phone className="size-3" />{m.phone}</a> : <span className="text-amber-600">No. telefon belum diisi</span>}
          <span>· {open} tugasan belum siap</span>
        </p>
      </div>
      {can.manage && <div className="flex shrink-0"><button aria-label={`Sunting ${m.name}`} onClick={() => onEdit(m)} className="p-2 rounded-lg hover:bg-navy-50 text-slate-500 cursor-pointer"><Pencil className="size-4" /></button><button aria-label={`Padam ${m.name}`} onClick={() => onDelete(m)} className="p-2 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 cursor-pointer"><Trash2 className="size-4" /></button></div>}
    </li>
  );
}

function MemberForm({ value, onClose }: { value: Partial<Member>; onClose: () => void }) {
  const { data, run } = useApp();
  const [f, setF] = useState({ name: value.name ?? "", unit_id: value.unit_id ? String(value.unit_id) : "", position: value.position ?? "Ahli", phone: value.phone ?? "", extra_resp: value.extra_resp ?? "", active: value.active ?? 1 });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string | number) => setF((p) => ({ ...p, [k]: v }));
  async function save() {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Nama diperlukan";
    if (!f.position.trim()) e.position = "Jawatan diperlukan";
    if (!PHONE_RE.test(f.phone.trim())) e.phone = "Contoh: 012-3456789 atau +60123456789";
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const body = { ...f, unit_id: f.unit_id || null };
    const ok = await run(() => value.id ? call("PATCH", `/api/r/members/${value.id}`, body) : call("POST", "/api/r/members", body), value.id ? "Maklumat ahli dikemas kini" : "Ahli ditambah");
    setBusy(false);
    if (ok) onClose();
  }
  return (
    <Modal open onClose={onClose} title={value.id ? "Sunting Ahli AJK" : "Tambah Ahli AJK"}
      footer={<><Button variant="outline" onClick={onClose}>Batal</Button><Button variant="gold" onClick={save} loading={busy}>Simpan</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama penuh *" error={err.name} className="sm:col-span-2"><Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="cth. Ustaz Ahmad" /></Field>
        <Field label="Unit jawatankuasa"><Select value={f.unit_id} onChange={(e) => set("unit_id", e.target.value)}><option value="">— Tiada unit —</option>{data.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>
        <Field label="Jawatan *" error={err.position}><Input list="pos" value={f.position} onChange={(e) => set("position", e.target.value)} /><datalist id="pos">{POSITIONS.map((p) => <option key={p} value={p} />)}</datalist></Field>
        <Field label="No. telefon (WhatsApp)" error={err.phone} hint="Biarkan kosong jika belum ada. Nombor 01x ditukar ke format 601x untuk WhatsApp." className="sm:col-span-2"><Input type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="012-3456789" /></Field>
        <Field label="Tanggungjawab tambahan" className="sm:col-span-2"><Textarea value={f.extra_resp} onChange={(e) => set("extra_resp", e.target.value)} placeholder="cth. Bendahari & Protokol" /></Field>
        <label className="sm:col-span-2 flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="size-4 accent-[#c9a227]" checked={!f.active} onChange={(e) => set("active", e.target.checked ? 0 : 1)} /><UserX className="size-4 text-slate-500" />Tandakan sebagai tidak aktif (tidak dikira dalam susulan)</label>
      </div>
    </Modal>
  );
}

function UnitForm({ value, onClose }: { value: Partial<Unit>; onClose: () => void }) {
  const { run } = useApp();
  const [name, setName] = useState(value.name ?? "");
  const [description, setDesc] = useState(value.description ?? "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!name.trim()) return setErr("Nama unit diperlukan");
    setErr(""); setBusy(true);
    const ok = await run(() => value.id ? call("PATCH", `/api/r/units/${value.id}`, { name, description }) : call("POST", "/api/r/units", { name, description }), "Unit disimpan");
    setBusy(false);
    if (ok) onClose();
  }
  return (
    <Modal open onClose={onClose} title={value.id ? "Sunting Unit" : "Unit Baharu"} footer={<><Button variant="outline" onClick={onClose}>Batal</Button><Button variant="gold" onClick={save} loading={busy}><Plus className="size-4" />Simpan</Button></>}>
      <div className="space-y-4"><Field label="Nama unit *" error={err}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field><Field label="Keterangan"><Textarea value={description} onChange={(e) => setDesc(e.target.value)} /></Field></div>
    </Modal>
  );
}
