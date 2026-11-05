"use client";
import { useMemo, useState } from "react";
import { CalendarClock, Clock3, History, MessageCircle, NotebookPen, PhoneOff, Search, Pencil, Trash2, BellRing, CheckCircle2 } from "lucide-react";
import { useApp, call } from "@/lib/store";
import { Badge, Button, Card, Empty, Input, PageHeader, Select, StatusBadge, cn } from "@/components/ui";
import { FollowupForm, WhatsAppModal } from "@/components/FollowForms";
import { effStatus, fmtDate, fmtDateTime, followRows, needsFollow, todayStr, unitName, memberName, daysBetween } from "@/lib/logic";
import type { FollowRow } from "@/lib/logic";
import type { Followup, Member } from "@/lib/types";

export default function Susulan() {
  const { data, run, confirm, can } = useApp();
  const [tab, setTab] = useState<"senarai" | "sejarah">("senarai");
  const [q, setQ] = useState("");
  const [unit, setUnit] = useState("");
  const [reason, setReason] = useState("");
  const [all, setAll] = useState(false);
  const [wa, setWa] = useState<Member | null>(null);
  const [form, setForm] = useState<(Partial<Followup> & { member_id?: number }) | null>(null);
  const today = todayStr();

  const rows = useMemo(() => followRows(data), [data]);
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => (all || needsFollow(r)) && (!unit || String(r.member.unit_id) === unit) && (!reason || r.reasons.some((x) => x.key === reason)) &&
      (!term || r.member.name.toLowerCase().includes(term) || r.tasks.some((t) => t.title.toLowerCase().includes(term))));
  }, [rows, q, unit, reason, all]);

  const todayList = rows.filter((r) => needsFollow(r) && (r.reasons.some((x) => x.key === "overdue" || x.key === "due")));
  const count = (k: string) => rows.filter((r) => r.reasons.some((x) => x.key === k)).length;

  const history = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.followups.filter((f) => (!unit || String(data.members.find((m) => m.id === f.member_id)?.unit_id) === unit) &&
      (!term || [memberName(data, f.member_id), f.summary, f.response, f.action_required].some((x) => x.toLowerCase().includes(term))));
  }, [data, q, unit]);

  async function delFu(f: Followup) {
    if (!(await confirm({ title: "Padam rekod susulan", message: `Padam rekod susulan ${memberName(data, f.member_id)} pada ${fmtDateTime(f.contacted_at)}?` }))) return;
    await run(() => call("DELETE", `/api/r/followups/${f.id}`), "Rekod dipadam");
  }

  return (
    <>
      <PageHeader title="AJK Follow-Up Center" sub="Siapa perlu dihubungi, tentang apa, dan bila"
        actions={<Button variant="gold" onClick={() => setForm({})}><NotebookPen className="size-4" />Rekod Susulan</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi icon={BellRing} tone="red" label="Perlu susulan hari ini" value={todayList.length} onClick={() => { setTab("senarai"); setReason(""); }} />
        <Kpi icon={Clock3} tone="red" label="Ada tugasan lewat" value={count("overdue")} onClick={() => { setTab("senarai"); setReason("overdue"); }} />
        <Kpi icon={PhoneOff} tone="amber" label="Belum membalas" value={count("noresp")} onClick={() => { setTab("senarai"); setReason("noresp"); }} />
        <Kpi icon={CalendarClock} tone="amber" label="Tiada kemas kini" value={count("stale")} onClick={() => { setTab("senarai"); setReason("stale"); }} />
      </div>

      <div className="flex gap-1 p-1 bg-white border border-navy-100 rounded-xl w-fit mb-4" role="tablist">
        {([["senarai", "Senarai Susulan", BellRing], ["sejarah", `Sejarah Susulan (${data.followups.length})`, History]] as const).map(([k, l, Icon]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("px-3.5 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 cursor-pointer", tab === k ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-navy-50")}><Icon className="size-4" />{l}</button>
        ))}
      </div>

      <Card className="p-3 sm:p-4 mb-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2"><Search className="size-4 absolute left-3.5 top-3.5 text-slate-400" /><Input type="search" className="pl-10" placeholder="Cari nama ahli atau tugasan…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari" /></div>
          {data.me.role === "admin" && <Select value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Tapis unit"><option value="">Semua unit</option>{data.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>}
          {tab === "senarai" && <Select value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Tapis sebab"><option value="">Semua sebab</option><option value="overdue">Tugasan lewat</option><option value="noresp">Belum membalas</option><option value="due">Tarikh susulan tiba</option><option value="stale">Tiada kemas kini</option><option value="never">Belum pernah dihubungi</option></Select>}
        </div>
        {tab === "senarai" && <label className="flex items-center gap-2 text-sm text-slate-600 mt-3 cursor-pointer w-fit"><input type="checkbox" className="size-4 accent-[#c9a227]" checked={all} onChange={(e) => setAll(e.target.checked)} />Tunjuk semua ahli yang mempunyai tugasan belum siap ({rows.length})</label>}
      </Card>

      {tab === "senarai" ? (
        shown.length === 0 ? <Card><Empty title={rows.length && !all ? "Tiada ahli perlu susulan sekarang 🎉" : "Tiada keputusan"} sub="Semua ahli dengan tugasan terbuka sudah dihubungi dan tiada yang lewat." /></Card> :
        <div className="grid gap-3 grid-cols-1">{shown.map((r) => <FollowCard key={r.member.id} r={r} onWa={() => setWa(r.member)} onLog={() => setForm({ member_id: r.member.id, task_id: r.tasks[0]?.id ?? null })} />)}</div>
      ) : (
        history.length === 0 ? <Card><Empty title="Belum ada sejarah susulan" sub="Rekod susulan akan dipaparkan di sini." action={<Button variant="gold" onClick={() => setForm({})}>Rekod Susulan</Button>} /></Card> :
        <div className="grid gap-3 grid-cols-1">{history.map((f) => (
          <Card key={f.id} className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2 mb-2"><span className="font-semibold text-navy-900">{memberName(data, f.member_id)}</span><Badge className="bg-navy-50 text-navy-700 ring-navy-100">{f.method}</Badge>{f.responded ? <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">Telah membalas</Badge> : <Badge className="bg-amber-50 text-amber-700 ring-amber-200">Belum membalas</Badge>}<span className="text-xs text-slate-500 ml-auto">{fmtDateTime(f.contacted_at)}</span></div>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Item l="Tugasan" v={f.task_id ? data.tasks.find((t) => t.id === f.task_id)?.title ?? "—" : "Umum"} />
              <Item l="Susulan seterusnya" v={fmtDate(f.next_followup)} />
              <Item l="Perbincangan" v={f.summary} /><Item l="Respons" v={f.response || "—"} /><Item l="Tindakan diperlukan" v={f.action_required || "—"} />
              <Item l="Direkod oleh" v={f.created_by || "—"} />
            </dl>
            <div className="flex gap-1 justify-end mt-2"><Button size="sm" variant="ghost" onClick={() => setForm(f)}><Pencil className="size-3.5" />Sunting</Button>{can.admin && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => delFu(f)}><Trash2 className="size-3.5" />Padam</Button>}</div>
          </Card>))}</div>
      )}

      {wa && <WhatsAppModal member={wa} onClose={() => setWa(null)} onSent={(taskId, message) => { const m = wa; setWa(null); setForm({ member_id: m.id, task_id: taskId, method: "WhatsApp", summary: `Follow-up dihantar melalui WhatsApp:\n${message}`, next_followup: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) }); }} />}
      {form && <FollowupForm key={form.id ?? `baru-${form.member_id ?? ""}-${form.summary?.length ?? 0}`} value={form} onClose={() => setForm(null)} />}
    </>
  );

  function FollowCard({ r, onWa, onLog }: { r: FollowRow; onWa: () => void; onLog: () => void }) {
    const next = r.next;
    const nextCls = next && next <= today ? "text-red-600 font-semibold" : "";
    return (
      <Card className={cn("p-4 sm:p-5", r.reasons.some((x) => x.key === "overdue") && "border-red-200")}>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-navy-900">{r.member.name}</h3><span className="text-xs text-slate-500">{unitName(data, r.member.unit_id)}</span></div>
            <div className="flex flex-wrap gap-1.5 mt-2">{r.reasons.map((x) => <Badge key={x.key} className={x.weight >= 60 ? "bg-red-50 text-red-700 ring-red-200" : x.weight >= 50 ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-slate-100 text-slate-600 ring-slate-200"}>{x.label}</Badge>)}</div>
            <ul className="mt-3 space-y-1.5">
              {r.tasks.slice(0, 3).map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-sm min-w-0"><StatusBadge s={effStatus(t, today)} /><span className="truncate text-navy-900">{t.title}</span><span className="text-xs text-slate-500 shrink-0">{t.deadline ? `· ${fmtDate(t.deadline)}` : ""} · {t.progress}%</span></li>
              ))}
              {r.tasks.length > 3 && <li className="text-xs text-slate-500">+{r.tasks.length - 3} tugasan lagi</li>}
            </ul>
          </div>
          <div className="lg:w-80 shrink-0 text-sm space-y-1.5">
            <p><span className="text-slate-500">Susulan terakhir:</span> <b className="text-navy-900">{r.lastDate ? fmtDateTime(r.lastDate) : "Belum pernah"}</b></p>
            <p><span className="text-slate-500">Respons terkini:</span> {r.last ? (r.last.responded ? <span className="text-emerald-700 inline-flex items-center gap-1"><CheckCircle2 className="size-3.5" />{r.last.response || "Dibalas"}</span> : <span className="text-amber-700">Belum membalas</span>) : "—"}</p>
            <p><span className="text-slate-500">Susulan seterusnya:</span> <span className={nextCls}>{next ? `${fmtDate(next)}${next <= today ? ` (${next === today ? "hari ini" : `lewat ${daysBetween(next, today)} hari`})` : ""}` : "Belum dijadualkan"}</span></p>
            <div className="flex flex-wrap gap-2 pt-1.5">
              <Button variant="whatsapp" size="sm" onClick={onWa}><MessageCircle className="size-4" />FOLLOW-UP VIA WHATSAPP</Button>
              <Button variant="outline" size="sm" onClick={onLog}><NotebookPen className="size-3.5" />Rekod</Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }
}

function Kpi({ icon: Icon, label, value, tone, onClick }: { icon: React.ElementType; label: string; value: number; tone: "red" | "amber"; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left cursor-pointer"><Card className="p-4 flex items-center gap-3 hover:border-gold-400 transition">
      <div className={cn("size-11 rounded-xl grid place-items-center", tone === "red" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600")}><Icon className="size-5" /></div>
      <div><p className="text-2xl font-bold text-navy-900 leading-none">{value}</p><p className="text-xs text-slate-500 mt-1.5">{label}</p></div>
    </Card></button>
  );
}
function Item({ l, v }: { l: string; v: string }) { return <div><dt className="text-[11px] uppercase tracking-wide text-slate-400">{l}</dt><dd className="text-navy-900 whitespace-pre-line">{v}</dd></div>; }
