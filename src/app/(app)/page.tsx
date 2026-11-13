"use client";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertOctagon, AlarmClock, CheckCircle2, Clock, Hourglass, Layers, ListTodo, Percent, Siren, TimerReset, Eye, UserRoundX, Users, Zap, Flag } from "lucide-react";
import { useApp } from "@/lib/store";
import { Badge, Card, CardHeader, Empty, PageHeader, Progress, cn } from "@/components/ui";
import { watchUrgent, attention, daysBetween, daysToEvent, fmtDate, memberName, stats, todayStr, unitName, unitTasks, STATUS_LABEL } from "@/lib/logic";
import { PRIORITY_LABEL } from "@/lib/logic";

const COLORS = { done: "#10b981", ongoing: "#1a3a7a", pending: "#94a3b8", overdue: "#dc2626" };

function Stat({ icon: Icon, label, value, tone = "navy", sub }: { icon: React.ElementType; label: string; value: React.ReactNode; tone?: "navy" | "gold" | "green" | "red" | "slate" | "blue"; sub?: string }) {
  const t = { navy: "bg-navy-50 text-navy-800", gold: "bg-gold-100 text-gold-600", green: "bg-emerald-50 text-emerald-600", red: "bg-red-50 text-red-600", slate: "bg-slate-100 text-slate-600", blue: "bg-sky-50 text-sky-700" }[tone];
  return (
    <Card className="p-4 flex items-center gap-3.5">
      <div className={cn("size-11 rounded-xl grid place-items-center shrink-0", t)}><Icon className="size-5" /></div>
      <div className="min-w-0"><p className="text-2xl font-bold text-navy-900 leading-none tabular-nums">{value}</p><p className="text-xs text-slate-500 mt-1.5 truncate">{label}</p>{sub && <p className="text-[11px] text-slate-400">{sub}</p>}</div>
    </Card>
  );
}

export default function Dashboard() {
  const { data } = useApp();
  const s = stats(data.tasks);
  const days = daysToEvent(data);
  const att = attention(data);
  const watchU = watchUrgent(data);
  const today = todayStr();
  const unitsWithData = data.units.filter((u) => !/^penasihat$/i.test(u.name) || unitTasks(data, u).length);
  const perUnit = unitsWithData.map((u) => { const st = stats(unitTasks(data, u)); return { id: u.id, name: u.name, short: u.name.replace(/ \(.*\)/, ""), ...st }; });
  const ranking = [...perUnit].filter((x) => x.total > 0).sort((a, b) => b.pct - a.pct || b.done - a.done);
  const pie = (["done", "ongoing", "pending", "overdue"] as const).map((k) => ({ key: k, name: STATUS_LABEL[k], value: s[k] })).filter((x) => x.value > 0);
  const isLeaderOrMember = data.me.role !== "admin";

  return (
    <>
      <PageHeader title={isLeaderOrMember ? `Salam, ${data.me.name}` : "Dashboard Eksekutif"} sub={`${data.settings.event_name} · ${fmtDate(data.settings.event_date)} · ${data.settings.venue}`} />

      <Card className="mb-6 overflow-hidden bg-gradient-to-r from-navy-900 to-navy-800 text-white border-0">
        <div className="p-5 sm:p-6 grid sm:grid-cols-[auto_1fr_auto] gap-5 items-center">
          <div className="flex items-baseline gap-2"><span className="text-5xl font-extrabold text-gold-400 tabular-nums">{Math.max(days, 0)}</span><span className="text-sm text-white/70">hari lagi</span></div>
          <div>
            <p className="text-sm text-white/70 mb-2">Kemajuan keseluruhan persiapan</p>
            <div className="h-3 rounded-full bg-white/15 overflow-hidden"><div className="h-full bg-gradient-to-r from-gold-500 to-gold-400 rounded-full transition-all duration-700" style={{ width: `${s.pct}%` }} /></div>
          </div>
          <p className="text-4xl font-extrabold tabular-nums">{s.pct}<span className="text-xl text-gold-400">%</span></p>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
        <Stat icon={Layers} label="Jumlah Unit" value={data.units.length} />
        <Stat icon={Users} label="Jumlah AJK" value={data.members.filter((m) => m.active).length} tone="gold" />
        <Stat icon={ListTodo} label="Jumlah Tugasan" value={s.total} />
        <Stat icon={CheckCircle2} label="Selesai" value={s.done} tone="green" />
        <Stat icon={Clock} label="Sedang Berjalan" value={s.ongoing} tone="blue" />
        <Stat icon={Hourglass} label="Belum Mula" value={s.pending} tone="slate" />
        <Stat icon={AlertOctagon} label="Lewat Tempoh" value={s.overdue} tone="red" />
        <Stat icon={Percent} label="Siap Keseluruhan" value={`${s.pct}%`} tone="gold" />
        <Stat icon={TimerReset} label="Hari ke Majlis" value={Math.max(days, 0)} tone="navy" />
        <Stat icon={Flag} label="Senarai Semak Majlis" value={`${data.checklist.filter((c) => c.done).length}/${data.checklist.length}`} tone="green" />
      </div>

      {/* PERHATIAN PENGARAH */}
      <Card className="mb-6 border-gold-400/60 ring-1 ring-gold-400/30">
        <CardHeader title={<span className="flex items-center gap-2"><Siren className="size-5 text-gold-600" />PERHATIAN PENGARAH</span>} sub="Perkara yang memerlukan tindakan anda hari ini" />
        <div className="px-5 pb-5 grid gap-4 lg:grid-cols-2">
          <AttBlock tone="red" icon={AlertOctagon} title="Tugasan Lewat Tempoh" count={att.overdue.length} href="/tugasan?tapis=overdue" empty="Tiada tugasan lewat 🎉">
            {att.overdue.slice(0, 5).map((t) => (
              <Row key={t.id} href={`/tugasan?cari=${encodeURIComponent(t.title)}`} main={t.title} sub={`${memberName(data, t.member_id)} · ${unitName(data, t.unit_id)}`} right={<Badge className="bg-red-50 text-red-700 ring-red-200">Lewat {daysBetween(t.deadline!, today)} hari</Badge>} />
            ))}
          </AttBlock>
          <AttBlock tone="amber" icon={AlarmClock} title={`Menghampiri Tarikh Akhir (${data.settings.soon_days} hari)`} count={att.soon.length} href="/tugasan" empty="Tiada tugasan hampir tarikh akhir">
            {att.soon.slice(0, 5).map((t) => (
              <Row key={t.id} href={`/tugasan?cari=${encodeURIComponent(t.title)}`} main={t.title} sub={`${memberName(data, t.member_id)} · ${t.progress}% siap`} right={<Badge className="bg-amber-50 text-amber-700 ring-amber-200">{daysBetween(today, t.deadline!) === 0 ? "Hari ini" : `${daysBetween(today, t.deadline!)} hari`}</Badge>} />
            ))}
          </AttBlock>
          {data.me.role !== "member" && (
            <AttBlock tone="navy" icon={UserRoundX} title="AJK Perlu Di-follow-up" count={att.members.length} href="/susulan" empty="Tiada AJK perlu di-follow-up">
              {att.members.slice(0, 5).map((r) => (
                <Row key={r.member.id} href="/susulan" main={r.member.name} sub={`${unitName(data, r.member.unit_id)} · ${r.tasks.length} tugasan belum siap`} right={<Badge className="bg-red-50 text-red-700 ring-red-200">{r.reasons[0].label}</Badge>} />
              ))}
            </AttBlock>
          )}
          <AttBlock tone="gold" icon={Zap} title="Persiapan Kritikal Belum Siap" count={att.critical.length + (days <= 14 ? att.checklistPending : 0)} href="/tugasan?tapis=Critical" empty="Tiada persiapan kritikal tertunggak">
            {att.critical.slice(0, 4).map((t) => (
              <Row key={t.id} href={`/tugasan?cari=${encodeURIComponent(t.title)}`} main={t.title} sub={`${unitName(data, t.unit_id)} · ${PRIORITY_LABEL[t.priority]}`} right={<span className="text-xs font-semibold tabular-nums text-navy-900">{t.progress}%</span>} />
            ))}
            {days <= 14 && att.checklistPending > 0 && <Row href="/senarai-semak" main={`${att.checklistPending} item senarai semak majlis belum ditanda`} sub="Kurang 14 hari ke majlis" right={null} />}
          </AttBlock>
          {data.watchReady && (
            <div className="lg:col-span-2">
              <AttBlock tone="navy" icon={Eye} title="Pantauan Pengarah & Timbalan" count={watchU.length} href="/pantauan" empty="Tiada pantauan yang mendesak. Tambah di menu Pantauan Pengarah.">
                {watchU.slice(0, 4).map((w) => (
                  <Row key={w.id} href="/pantauan" main={w.title} sub={`${w.owner === "Berdua" ? "Berdua" : w.owner}${w.due_date ? ` · semak ${fmtDate(w.due_date)}` : ""}`} right={w.due_date && daysBetween(todayStr(), w.due_date) < 0 ? <Badge className="bg-red-50 text-red-700 ring-red-200">Lewat</Badge> : null} />
                ))}
              </AttBlock>
            </div>
          )}
          {att.staleUnits.length > 0 && (
            <div className="lg:col-span-2">
              <AttBlock tone="slate" icon={Clock} title={`Unit Tiada Kemas Kini (≥ ${data.settings.stale_days} hari)`} count={att.staleUnits.length} href="/prestasi" empty="">
                <div className="flex flex-wrap gap-2 p-1">{att.staleUnits.map(({ unit, days: dd }) => <Link key={unit.id} href="/prestasi"><Badge className="bg-slate-100 text-slate-700 ring-slate-200 hover:bg-slate-200">{unit.name} · {dd} hari</Badge></Link>)}</div>
              </AttBlock>
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Kemajuan Mengikut Unit" sub="Peratus siap purata setiap unit" />
          <div className="px-3 pb-4 h-[360px]">
            {perUnit.some((u) => u.total) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perUnit.filter((u) => u.total)} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <CartesianGrid horizontal={false} stroke="#e3e9f5" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="short" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v}%`, "Siap"]} />
                  <Bar dataKey="pct" fill="#c9a227" radius={[0, 6, 6, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty title="Tiada data tugasan" />}
          </div>
        </Card>
        <Card>
          <CardHeader title="Taburan Status Tugasan" />
          <div className="px-3 pb-4 h-[360px]">
            {pie.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius={62} outerRadius={100} paddingAngle={2}>
                    {pie.map((p) => <Cell key={p.key} fill={COLORS[p.key]} />)}
                  </Pie>
                  <Tooltip /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <Empty title="Tiada data" />}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Selesai vs Belum Selesai" sub="Mengikut unit" />
          <div className="px-3 pb-4 h-[360px]">
            {perUnit.some((u) => u.total) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perUnit.filter((u) => u.total)} margin={{ bottom: 40 }}>
                  <CartesianGrid vertical={false} stroke="#e3e9f5" />
                  <XAxis dataKey="short" tick={{ fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={70} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip /><Legend verticalAlign="top" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="done" name="Selesai" stackId="a" fill={COLORS.done} />
                  <Bar dataKey="ongoing" name="Sedang Berjalan" stackId="a" fill={COLORS.ongoing} />
                  <Bar dataKey="pending" name="Belum Mula" stackId="a" fill={COLORS.pending} />
                  <Bar dataKey="overdue" name="Lewat" stackId="a" fill={COLORS.overdue} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty title="Tiada data" />}
          </div>
        </Card>
        <Card>
          <CardHeader title="Kedudukan Prestasi Unit" sub="Disusun mengikut peratus siap" action={<Link href="/prestasi" className="text-xs font-semibold text-gold-600 hover:underline">Lihat semua →</Link>} />
          <ol className="px-5 pb-5 space-y-3 max-h-[360px] overflow-y-auto scroll-thin">
            {ranking.length === 0 && <Empty title="Tiada data" />}
            {ranking.map((u, i) => (
              <li key={u.id} className="flex items-center gap-3">
                <span className={cn("size-7 rounded-full grid place-items-center text-xs font-bold shrink-0", i === 0 ? "bg-gold-500 text-navy-950" : i < 3 ? "bg-gold-100 text-gold-600" : "bg-navy-50 text-navy-700")}>{i + 1}</span>
                <div className="min-w-0 flex-1"><div className="flex justify-between text-sm gap-2"><span className="truncate font-medium text-navy-900">{u.name}</span>{u.overdue > 0 && <span className="text-[11px] text-red-600 shrink-0">{u.overdue} lewat</span>}</div><Progress value={u.pct} overdue={u.overdue > 0} /></div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}

function AttBlock({ tone, icon: Icon, title, count, href, empty, children }: { tone: "red" | "amber" | "navy" | "gold" | "slate"; icon: React.ElementType; title: string; count: number; href: string; empty: string; children?: React.ReactNode }) {
  const c = { red: "text-red-600 bg-red-50", amber: "text-amber-600 bg-amber-50", navy: "text-navy-800 bg-navy-50", gold: "text-gold-600 bg-gold-100", slate: "text-slate-600 bg-slate-100" }[tone];
  return (
    <div className="rounded-xl border border-navy-100 bg-white">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-navy-100">
        <div className={cn("size-8 rounded-lg grid place-items-center", c)}><Icon className="size-4" /></div>
        <p className="font-semibold text-sm text-navy-900 flex-1">{title}</p>
        <Link href={href} className={cn("text-xs font-bold rounded-full px-2.5 py-1", count ? c : "bg-slate-100 text-slate-500")}>{count}</Link>
      </div>
      <div className="p-2">{count === 0 ? <p className="text-sm text-slate-500 px-2 py-3">{empty}</p> : children}</div>
    </div>
  );
}
function Row({ href, main, sub, right }: { href: string; main: string; sub: string; right: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-navy-50">
      <div className="min-w-0 flex-1"><p className="text-sm font-medium text-navy-900 truncate">{main}</p><p className="text-xs text-slate-500 truncate">{sub}</p></div>{right}
    </Link>
  );
}
