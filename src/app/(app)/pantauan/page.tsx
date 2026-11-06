"use client";
import { useMemo, useState } from "react";
import { AlarmClock, Check, Copy, Eye, Link2, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useApp, call } from "@/lib/store";
import { Badge, Button, Card, Empty, Input, PageHeader, PriorityBadge, Progress, Select, StatusBadge, cn } from "@/components/ui";
import { WatchForm, ownerLabel } from "@/components/WatchForm";
import { daysBetween, effStatus, fmtDate, memberName, todayStr, unitName, watchUrgent } from "@/lib/logic";
import { WATCH_SQL } from "@/lib/setup-sql";
import type { WatchItem } from "@/lib/types";

export default function Pantauan() {
  const { data, run, confirm, toast } = useApp();
  const [who, setWho] = useState<"" | WatchItem["owner"]>("");
  const [showDone, setShowDone] = useState(false);
  const [edit, setEdit] = useState<Partial<WatchItem> | null>(null);
  const [quick, setQuick] = useState("");
  const [quickOwner, setQuickOwner] = useState<WatchItem["owner"]>("Berdua");
  const today = todayStr();

  const urgentIds = useMemo(() => new Set(watchUrgent(data).map((w) => w.id)), [data]);
  const mine = useMemo(() => data.watch.filter((w) => !who || w.owner === who || w.owner === "Berdua"), [data.watch, who]);
  const open = mine.filter((w) => !w.done);
  const urgent = open.filter((w) => urgentIds.has(w.id)).sort((a, b) => (a.due_date ?? "9").localeCompare(b.due_date ?? "9"));
  const normal = open.filter((w) => !urgentIds.has(w.id)).sort((a, b) => (a.due_date ?? "9").localeCompare(b.due_date ?? "9") || b.id - a.id);
  const done = mine.filter((w) => w.done).sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));

  async function addQuick() {
    if (!quick.trim()) return;
    const ok = await run(() => call("POST", "/api/r/watch", { title: quick, owner: quickOwner }), "Ditambah");
    if (ok) setQuick("");
  }
  async function toggle(w: WatchItem) { await run(() => call("PATCH", `/api/r/watch/${w.id}`, { done: !w.done })); }
  async function del(w: WatchItem) {
    if (!(await confirm({ title: "Padam pantauan", message: `Padam "${w.title}" berserta catatannya?` }))) return;
    await run(() => call("DELETE", `/api/r/watch/${w.id}`), "Pantauan dipadam");
  }
  async function copySql() { try { await navigator.clipboard.writeText(WATCH_SQL); toast("ok", "SQL disalin"); } catch { toast("err", "Tidak dapat menyalin. Pilih teks dan salin secara manual."); } }

  if (!data.watchReady) {
    return (
      <>
        <PageHeader title="Pantauan Pengarah" sub="Senarai pantau dan catatan untuk Pengarah dan Timbalan Pengarah" />
        <Card className="p-5 space-y-3 max-w-2xl">
          <div className="flex gap-3"><TriangleAlert className="size-5 text-amber-600 shrink-0 mt-0.5" /><p className="text-sm text-slate-700">Ciri ini perlukan satu jadual baharu dalam pangkalan data. Jalankan SQL di bawah <b>sekali sahaja</b>: Supabase → <b>SQL Editor → New query</b> → tampal → <b>Run</b>. Kemudian muat semula halaman ini.</p></div>
          <Button variant="outline" size="sm" onClick={copySql}><Copy className="size-4" />Salin SQL</Button>
          <pre className="max-h-48 overflow-auto scroll-thin rounded-xl bg-navy-950 text-white/80 text-[11px] p-3">{WATCH_SQL}</pre>
        </Card>
      </>
    );
  }

  const card = (w: WatchItem) => {
    const task = w.task_id ? data.tasks.find((t) => t.id === w.task_id) : undefined;
    const dd = w.due_date ? daysBetween(today, w.due_date) : null;
    const late = !w.done && dd !== null && dd < 0;
    return (
      <Card key={w.id} className={cn("p-4 sm:p-5", urgentIds.has(w.id) && !w.done && "border-gold-400 ring-1 ring-gold-400/30", w.done && "opacity-70")}>
        <div className="flex gap-3">
          <button onClick={() => toggle(w)} role="checkbox" aria-checked={!!w.done} aria-label={w.done ? "Tandakan belum siap" : "Tandakan siap"}
            className={cn("mt-0.5 size-6 rounded-md border-2 grid place-items-center shrink-0 cursor-pointer transition", w.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 bg-white hover:border-gold-500")}>{w.done ? <Check className="size-4" strokeWidth={3} /> : null}</button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <Badge className="bg-navy-50 text-navy-700 ring-navy-100"><Eye className="size-3" />{w.owner === "Berdua" ? "Berdua" : ownerLabel(data, w.owner)}</Badge>
              <PriorityBadge p={w.priority} />
              {w.due_date && <Badge className={late ? "bg-red-50 text-red-700 ring-red-200" : "bg-slate-100 text-slate-600 ring-slate-200"}><AlarmClock className="size-3" />{fmtDate(w.due_date)}{!w.done && dd !== null ? (dd < 0 ? ` · lewat ${-dd} hari` : dd === 0 ? " · hari ini" : ` · ${dd} hari`) : ""}</Badge>}
            </div>
            <h3 className={cn("font-semibold text-navy-900 leading-snug", w.done && "line-through text-slate-500")}>{w.title}</h3>
            {w.notes && <p className="text-sm text-slate-600 mt-1.5 whitespace-pre-line rounded-lg bg-gold-50 border border-gold-100 px-3 py-2">{w.notes}</p>}
            {task && (
              <div className="mt-2.5 rounded-lg border border-navy-100 p-3 text-sm">
                <p className="flex items-center gap-1.5 text-xs text-slate-500 mb-1"><Link2 className="size-3" />Tugasan berkaitan</p>
                <div className="flex flex-wrap items-center gap-2"><StatusBadge s={effStatus(task, today)} /><span className="font-medium text-navy-900">{task.title}</span></div>
                <p className="text-xs text-slate-500 mt-1">{memberName(data, task.member_id)} · {unitName(data, task.unit_id)} · {task.deadline ? fmtDate(task.deadline) : "tiada tarikh akhir"}</p>
                <Progress value={task.progress} overdue={effStatus(task, today) === "overdue"} className="mt-1.5" />
              </div>
            )}
            <div className="flex items-center gap-1 mt-2">
              <span className="text-[11px] text-slate-400 mr-auto">{w.done ? `Siap ${fmtDate(w.done_at)} oleh ${w.done_by}` : `Dicatat oleh ${w.created_by || "-"}`}</span>
              <Button size="sm" variant="ghost" aria-label={`Sunting ${w.title}`} onClick={() => setEdit(w)}><Pencil className="size-3.5" />Sunting</Button>
              <Button size="sm" variant="ghost" className="text-red-600" aria-label={`Padam ${w.title}`} onClick={() => del(w)}><Trash2 className="size-3.5" /></Button>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <>
      <PageHeader title="Pantauan Pengarah" sub="Perkara yang Pengarah dan Timbalan Pengarah perlu pantau dan ingat"
        actions={<Button variant="gold" onClick={() => setEdit({})}><Plus className="size-4" />Pantauan Baharu</Button>} />

      <Card className="p-3 sm:p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input value={quick} onChange={(e) => setQuick(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addQuick()} placeholder="Tulis catatan atau pantauan baharu, kemudian tekan Tambah…" aria-label="Pantauan pantas" />
          <Select value={quickOwner} onChange={(e) => setQuickOwner(e.target.value as WatchItem["owner"])} className="sm:w-52" aria-label="Siapa pantau"><option value="Berdua">Berdua</option><option value="Pengarah">Pengarah</option><option value="Timbalan Pengarah">Timbalan Pengarah</option></Select>
          <Button variant="primary" onClick={addQuick} disabled={!quick.trim()}><Plus className="size-4" />Tambah</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {([["", "Semua"], ["Pengarah", "Pengarah"], ["Timbalan Pengarah", "Timbalan Pengarah"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setWho(k)} className={cn("px-3 py-1.5 rounded-full text-sm cursor-pointer", who === k ? "bg-navy-900 text-white" : "bg-navy-50 text-slate-600")}>{l}</button>))}
          <label className="ml-auto flex items-center gap-2 text-sm text-slate-600 cursor-pointer"><input type="checkbox" className="size-4 accent-[#c9a227]" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />Tunjuk yang selesai ({done.length})</label>
        </div>
      </Card>

      {open.length === 0 && !showDone && <Card><Empty title="Tiada pantauan terbuka" sub="Tambah apa sahaja yang tidak mahu terlepas pandang, contohnya pengesahan perasmi atau tugasan yang perlu diikuti." /></Card>}
      {urgent.length > 0 && (<section className="mb-6"><h2 className="text-sm font-bold text-gold-600 tracking-wide mb-2 flex items-center gap-2"><AlarmClock className="size-4" />PERLU PERHATIAN ({urgent.length})</h2><div className="grid gap-3 grid-cols-1">{urgent.map(card)}</div></section>)}
      {normal.length > 0 && (<section className="mb-6"><h2 className="text-sm font-bold text-navy-800 tracking-wide mb-2">DALAM PANTAUAN ({normal.length})</h2><div className="grid gap-3 grid-cols-1">{normal.map(card)}</div></section>)}
      {showDone && done.length > 0 && (<section><h2 className="text-sm font-bold text-slate-500 tracking-wide mb-2">SELESAI ({done.length})</h2><div className="grid gap-3 grid-cols-1">{done.map(card)}</div></section>)}

      {edit && <WatchForm key={edit.id ?? "baru"} value={edit} onClose={() => setEdit(null)} />}
    </>
  );
}
