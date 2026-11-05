"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUpDown, Crown, Plus, Trophy } from "lucide-react";
import { useApp } from "@/lib/store";
import { Badge, Button, Card, CardHeader, Empty, PageHeader, PriorityBadge, Progress, StatusBadge, cn } from "@/components/ui";
import { TaskForm } from "@/components/TaskForm";
import { effStatus, fmtDate, memberName, stats, todayStr, unitLead, unitNeedsAttention, unitTasks } from "@/lib/logic";
import type { Task, Unit } from "@/lib/types";

export default function Prestasi() {
  const { data, can } = useApp();
  const [sel, setSel] = useState<number | null>(data.me.role === "admin" ? null : data.units[0]?.id ?? null);
  const [sortBy, setSortBy] = useState<"pct" | "overdue" | "name">("pct");
  const [addFor, setAddFor] = useState<Partial<Task> | null>(null);
  const today = todayStr();

  const rows = useMemo(() => data.units.map((u) => ({ u, s: stats(unitTasks(data, u)), lead: unitLead(data, u.id), members: data.members.filter((m) => m.unit_id === u.id && m.active), attn: unitNeedsAttention(data, u) }))
    .sort((a, b) => sortBy === "pct" ? b.s.pct - a.s.pct : sortBy === "overdue" ? b.s.overdue - a.s.overdue : a.u.name.localeCompare(b.u.name)), [data, sortBy]);
  const withTasks = rows.filter((r) => r.s.total > 0);
  const attention = rows.filter((r) => r.attn);
  const selected = rows.find((r) => r.u.id === sel);

  return (
    <>
      <PageHeader title="Prestasi Unit" sub="Bandingkan kemajuan setiap unit jawatankuasa" />
      {attention.length > 0 && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3"><AlertTriangle className="size-5 text-red-600 shrink-0 mt-0.5" /><div className="text-sm text-red-800"><b>{attention.length} unit perlu perhatian segera:</b> {attention.map((a) => a.u.name).join(", ")}. <span className="text-red-600/80">(Ada tugasan lewat, atau kemajuan di bawah 25% kurang 14 hari ke majlis.)</span></div></div>
      )}

      <Card className="mb-6">
        <CardHeader title="Perbandingan Semua Unit" action={<div className="flex items-center gap-1 text-xs"><ArrowUpDown className="size-3.5 text-slate-400" />{([["pct", "% siap"], ["overdue", "Lewat"], ["name", "Nama"]] as const).map(([k, l]) => <button key={k} onClick={() => setSortBy(k)} className={cn("px-2.5 py-1 rounded-full cursor-pointer", sortBy === k ? "bg-navy-900 text-white" : "bg-navy-50 text-slate-600")}>{l}</button>)}</div>} />
        <div className="px-5 pb-5 overflow-x-auto scroll-thin">
          {withTasks.length === 0 ? <Empty title="Tiada tugasan lagi" /> : (
            <table className="w-full text-sm min-w-[640px]">
              <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400"><th className="py-2 font-medium">#</th><th className="font-medium">Unit</th><th className="font-medium text-center">Jumlah</th><th className="font-medium text-center">Selesai</th><th className="font-medium text-center">Berjalan</th><th className="font-medium text-center">Belum</th><th className="font-medium text-center">Lewat</th><th className="font-medium w-48">Kemajuan</th></tr></thead>
              <tbody>{withTasks.map(({ u, s, attn }, i) => (
                <tr key={u.id} onClick={() => setSel(u.id)} className="border-t border-navy-100 hover:bg-navy-50 cursor-pointer">
                  <td className="py-3 pr-2">{sortBy === "pct" && i === 0 ? <Trophy className="size-4 text-gold-500" /> : i + 1}</td>
                  <td className="pr-3 font-medium text-navy-900">{u.name}{attn && <Badge className="ml-2 bg-red-50 text-red-700 ring-red-200">Perhatian</Badge>}</td>
                  <td className="text-center tabular-nums">{s.total}</td><td className="text-center tabular-nums text-emerald-700">{s.done}</td><td className="text-center tabular-nums text-sky-700">{s.ongoing}</td><td className="text-center tabular-nums text-slate-500">{s.pending}</td><td className={cn("text-center tabular-nums", s.overdue ? "text-red-600 font-bold" : "text-slate-400")}>{s.overdue}</td>
                  <td><Progress value={s.pct} overdue={s.overdue > 0} /></td>
                </tr>))}</tbody>
            </table>
          )}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Pilih unit">
        {data.me.role === "admin" && <button onClick={() => setSel(null)} className={cn("px-3 py-1.5 rounded-full text-sm cursor-pointer", sel === null ? "bg-navy-900 text-white" : "bg-white border border-navy-100 text-slate-600")}>Semua unit</button>}
        {rows.map(({ u, attn }) => <button key={u.id} role="tab" aria-selected={sel === u.id} onClick={() => setSel(u.id)} className={cn("px-3 py-1.5 rounded-full text-sm cursor-pointer", sel === u.id ? "bg-navy-900 text-white" : "bg-white border border-navy-100 text-slate-600 hover:border-gold-400", attn && sel !== u.id && "border-red-300")}>{u.name.replace(/ \(.*\)/, "")}</button>)}
      </div>

      {selected ? <UnitPanel u={selected.u} onAdd={can.editTasks ? () => setAddFor({ unit_id: selected.u.id }) : undefined} /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ u, s, lead, members, attn }) => (
            <button key={u.id} onClick={() => setSel(u.id)} className="text-left cursor-pointer">
              <Card className={cn("p-5 h-full hover:border-gold-400 transition", attn && "border-red-300 ring-1 ring-red-100")}>
                <div className="flex items-start justify-between gap-2"><h3 className="font-semibold text-navy-900 leading-snug">{u.name}</h3>{attn && <Badge className="bg-red-50 text-red-700 ring-red-200 shrink-0">Perhatian</Badge>}</div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Crown className="size-3 text-gold-500" />{lead?.name ?? "Tiada ketua"} · {members.length} ahli</p>
                <Progress value={s.pct} overdue={s.overdue > 0} className="mt-4" />
                <div className="grid grid-cols-4 gap-1 mt-4 text-center">{[["Jumlah", s.total, ""], ["Selesai", s.done, "text-emerald-700"], ["Berjalan", s.ongoing, "text-sky-700"], ["Lewat", s.overdue, s.overdue ? "text-red-600" : "text-slate-400"]].map(([l, v, c]) => <div key={String(l)}><p className={cn("text-lg font-bold tabular-nums", String(c))}>{v}</p><p className="text-[10px] text-slate-500">{l}</p></div>)}</div>
              </Card>
            </button>
          ))}
        </div>
      )}
      {addFor && <TaskForm value={addFor} onClose={() => setAddFor(null)} />}
    </>
  );

  function UnitPanel({ u, onAdd }: { u: Unit; onAdd?: () => void }) {
    const ts = unitTasks(data, u);
    const s = stats(ts);
    const lead = unitLead(data, u.id);
    const members = data.members.filter((m) => m.unit_id === u.id && m.active);
    return (
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1 p-5">
          <h2 className="text-lg font-bold text-navy-900">{u.name}</h2>
          <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1"><Crown className="size-4 text-gold-500" />Ketua: <b className="text-navy-900">{lead?.name ?? "—"}</b></p>
          <div className="mt-5 text-center"><p className="text-5xl font-extrabold text-navy-900 tabular-nums">{s.pct}<span className="text-gold-500 text-2xl">%</span></p><p className="text-xs text-slate-500">siap keseluruhan</p></div>
          <Progress value={s.pct} overdue={s.overdue > 0} showLabel={false} className="mt-3" />
          <div className="grid grid-cols-2 gap-2 mt-5 text-center">
            {[["Jumlah tugasan", s.total, "bg-navy-50 text-navy-900"], ["Selesai", s.done, "bg-emerald-50 text-emerald-700"], ["Sedang berjalan", s.ongoing, "bg-sky-50 text-sky-700"], ["Belum mula", s.pending, "bg-slate-100 text-slate-600"], ["Lewat tempoh", s.overdue, s.overdue ? "bg-red-50 text-red-700" : "bg-slate-50 text-slate-400"]].map(([l, v, c]) => <div key={String(l)} className={cn("rounded-xl py-3 last:col-span-2", String(c))}><p className="text-2xl font-bold tabular-nums">{v}</p><p className="text-[11px]">{l}</p></div>)}
          </div>
          <h3 className="text-xs font-semibold text-navy-800 mt-5 mb-2">Ahli ({members.length})</h3>
          <ul className="space-y-2">{members.map((m) => { const ms = stats(ts.filter((t) => t.member_id === m.id)); return <li key={m.id} className="text-sm"><div className="flex justify-between gap-2"><span className="truncate">{m.name} <span className="text-xs text-slate-400">· {m.position}</span></span><span className="text-xs text-slate-500 shrink-0">{ms.done}/{ms.total}</span></div><Progress value={ms.pct} showLabel={false} /></li>; })}</ul>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Tugasan Unit" action={onAdd && <Button size="sm" variant="gold" onClick={onAdd}><Plus className="size-3.5" />Tambah</Button>} />
          <div className="px-5 pb-5 space-y-2.5">
            {ts.length === 0 ? <Empty title="Belum ada tugasan untuk unit ini" /> : ts.map((t) => (
              <div key={t.id} className="rounded-xl border border-navy-100 p-3.5">
                <div className="flex flex-wrap items-center gap-1.5 mb-1"><StatusBadge s={effStatus(t, today)} /><PriorityBadge p={t.priority} /></div>
                <p className="font-medium text-navy-900 text-sm">{t.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{memberName(data, t.member_id)} · {t.deadline ? fmtDate(t.deadline) : "tiada tarikh akhir"}</p>
                <Progress value={t.progress} overdue={effStatus(t, today) === "overdue"} className="mt-2" />
              </div>))}
          </div>
        </Card>
      </div>
    );
  }
}
