"use client";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarClock, Eye, Paperclip, Pencil, Plus, Search, Trash2, User, X, Info } from "lucide-react";
import { useApp, call } from "@/lib/store";
import { Badge, Button, Card, Empty, Input, PageHeader, PriorityBadge, Progress, Select, StatusBadge, Spinner } from "@/components/ui";
import { TaskForm } from "@/components/TaskForm";
import { WatchForm } from "@/components/WatchForm";
import { daysBetween, effStatus, fmtDate, memberName, PRIORITY_ORDER, stats, todayStr, unitName, daysSince } from "@/lib/logic";
import type { Task } from "@/lib/types";

export default function Page() { return <Suspense fallback={<Spinner />}><Tugasan /></Suspense>; }

function Tugasan() {
  const { data, run, confirm, can } = useApp();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("cari") ?? "");
  const tapis = sp.get("tapis") ?? "";
  const [status, setStatus] = useState(["overdue", "ongoing", "pending", "done"].includes(tapis) ? tapis : "");
  const [priority, setPriority] = useState(["Low", "Medium", "High", "Critical"].includes(tapis) ? tapis : "");
  const [unit, setUnit] = useState("");
  const [member, setMember] = useState("");
  const [sort, setSort] = useState("deadline");
  const [edit, setEdit] = useState<Partial<Task> | null>(null);
  const [watchFor, setWatchFor] = useState<Task | null>(null);
  const watched = new Set(data.watch.filter((w) => !w.done && w.task_id).map((w) => w.task_id));
  const today = todayStr();

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const r = data.tasks.filter((t) =>
      (!status || effStatus(t, today) === status) && (!priority || t.priority === priority) &&
      (!unit || String(t.unit_id) === unit) && (!member || (member === "none" ? !t.member_id : String(t.member_id) === member)) &&
      (!term || [t.title, t.description, t.notes, memberName(data, t.member_id), unitName(data, t.unit_id)].some((x) => x.toLowerCase().includes(term))));
    const dl = (t: Task) => t.deadline ?? "9999-12-31";
    return r.sort((a, b) =>
      sort === "priority" ? PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || dl(a).localeCompare(dl(b))
      : sort === "progress" ? a.progress - b.progress
      : sort === "updated" ? b.updated_at.localeCompare(a.updated_at)
      : dl(a).localeCompare(dl(b)) || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }, [data, q, status, priority, unit, member, sort, today]);

  const s = stats(list);
  const drafts = data.tasks.filter((t) => t.is_draft).length;
  const noDeadline = data.tasks.filter((t) => !t.deadline && t.status !== "done").length;
  const filtered = !!(q || status || priority || unit || member);
  const memberOptions = data.members.filter((m) => m.active && (!unit || String(m.unit_id) === unit));

  async function del(t: Task) {
    if (!(await confirm({ title: "Padam tugasan", message: `Padam tugasan "${t.title}" berserta lampiran dan sejarahnya? Tindakan ini tidak boleh dibatalkan.` }))) return;
    await run(() => call("DELETE", `/api/r/tasks/${t.id}`), "Tugasan dipadam");
  }
  return (
    <>
      <PageHeader title="Pengurusan Tugasan" sub={`${data.tasks.length} tugasan · ${s.done} selesai · ${s.overdue} lewat`}
        actions={can.editTasks && <Button variant="gold" onClick={() => setEdit({ unit_id: data.me.role === "leader" ? data.me.unitId : null })}><Plus className="size-4" />Tugasan Baharu</Button>} />

      {can.editTasks && (drafts > 0 || noDeadline > 0) && (
        <div className="mb-5 flex gap-3 rounded-xl border border-gold-400/50 bg-gold-50 p-4 text-sm text-navy-900">
          <Info className="size-5 text-gold-600 shrink-0 mt-0.5" />
          <p>{drafts > 0 && <><b>{drafts} tugasan</b> ialah tugasan permulaan (draf) berdasarkan fungsi setiap unit — sila semak dan gantikan mengikut deskripsi tugas rasmi dalam kertas cadangan. </>}{drafts > 0 && "Tarikh akhir yang dipaparkan ialah jadual cadangan — laraskan jika perlu. "}{noDeadline > 0 && <><b>{noDeadline} tugasan</b> belum mempunyai tarikh akhir; tetapkan supaya pengesanan "lewat tempoh" berfungsi.</>}</p>
        </div>
      )}

      <Card className="p-3 sm:p-4 mb-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2"><Search className="size-4 absolute left-3.5 top-3.5 text-slate-400" /><Input type="search" className="pl-10" placeholder="Cari tugasan, nama, unit…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari tugasan" /></div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Tapis status"><option value="">Semua status</option><option value="pending">Belum Mula</option><option value="ongoing">Sedang Berjalan</option><option value="done">Selesai</option><option value="overdue">Lewat Tempoh</option></Select>
          <Select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Tapis keutamaan"><option value="">Semua keutamaan</option><option value="Critical">Kritikal</option><option value="High">Tinggi</option><option value="Medium">Sederhana</option><option value="Low">Rendah</option></Select>
          {data.me.role === "admin" && <Select value={unit} onChange={(e) => { setUnit(e.target.value); setMember(""); }} aria-label="Tapis unit"><option value="">Semua unit</option>{data.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>}
          {data.me.role !== "member" && <Select value={member} onChange={(e) => setMember(e.target.value)} aria-label="Tapis ahli"><option value="">Semua ahli</option><option value="none">Belum ditugaskan</option>{memberOptions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
          <span>Susun:</span>
          <Select value={sort} onChange={(e) => setSort(e.target.value)} className="!w-auto !py-1.5 !text-xs" aria-label="Susun mengikut"><option value="deadline">Tarikh akhir</option><option value="priority">Keutamaan</option><option value="progress">Kemajuan (terendah)</option><option value="updated">Kemas kini terkini</option></Select>
          <span className="ml-auto">{list.length} daripada {data.tasks.length} tugasan</span>
          {filtered && <button onClick={() => { setQ(""); setStatus(""); setPriority(""); setUnit(""); setMember(""); }} className="inline-flex items-center gap-1 text-gold-600 font-semibold cursor-pointer"><X className="size-3.5" />Kosongkan tapisan</button>}
        </div>
      </Card>

      {list.length === 0 ? (
        <Card><Empty title={data.tasks.length ? "Tiada tugasan sepadan dengan tapisan" : "Belum ada tugasan"} sub={data.tasks.length ? "Cuba ubah atau kosongkan tapisan." : "Tambah tugasan pertama untuk mula memantau."} action={can.editTasks && !data.tasks.length ? <Button variant="gold" onClick={() => setEdit({})}><Plus className="size-4" />Tugasan Baharu</Button> : undefined} /></Card>
      ) : (
        <div className="grid gap-3 grid-cols-1">
          {list.map((t) => {
            const es = effStatus(t, today);
            const nAtt = data.attachments.filter((a) => a.task_id === t.id).length;
            const dd = t.deadline ? daysBetween(today, t.deadline) : null;
            const canEdit = can.editTasks || t.member_id === data.me.memberId;
            return (
              <Card key={t.id} className={`p-4 sm:p-5 ${es === "overdue" ? "border-red-200 bg-red-50/30" : ""}`}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5"><StatusBadge s={es} /><PriorityBadge p={t.priority} />{t.is_draft ? <Badge className="bg-gold-50 text-gold-600 ring-gold-100">Draf</Badge> : null}</div>
                    <h3 className="font-semibold text-navy-900 leading-snug">{t.title}</h3>
                    {t.description && <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{t.description}</p>}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1"><User className="size-3.5" />{memberName(data, t.member_id)} · {unitName(data, t.unit_id)}</span>
                      <span className={`inline-flex items-center gap-1 ${es === "overdue" ? "text-red-600 font-semibold" : ""}`}><CalendarClock className="size-3.5" />{t.deadline ? `${fmtDate(t.deadline)}${dd !== null && t.status !== "done" ? (dd < 0 ? ` (lewat ${-dd} hari)` : dd === 0 ? " (hari ini)" : ` (${dd} hari lagi)`) : ""}` : "Tarikh akhir belum ditetapkan"}</span>
                      {nAtt > 0 && <span className="inline-flex items-center gap-1"><Paperclip className="size-3.5" />{nAtt}</span>}
                      <span className="text-slate-400">Dikemas kini {(() => { const d = daysSince(t.updated_at); return d === 0 ? "hari ini" : `${d} hari lalu`; })()}</span>
                    </div>
                    {t.notes && !t.is_draft && <p className="text-xs text-slate-500 mt-2 italic line-clamp-2">“{t.notes}”</p>}
                  </div>
                  <div className="lg:w-64 shrink-0 space-y-2.5">
                    <Progress value={t.progress} overdue={es === "overdue"} />
                    <div className="flex gap-2">
                      {canEdit && <Button size="sm" variant="outline" className="flex-1" onClick={() => setEdit(t)}><Pencil className="size-3.5" />{can.editTasks ? "Sunting" : "Kemas kini"}</Button>}
                      {t.status !== "done" && canEdit && <Button size="sm" variant="primary" onClick={() => run(() => call("PATCH", `/api/r/tasks/${t.id}`, { ...t, status: "done", progress: 100 }), "Ditanda selesai")}>Selesai</Button>}
                      {data.watchReady && <Button size="sm" variant={watched.has(t.id) ? "gold" : "outline"} aria-label={watched.has(t.id) ? `${t.title} sedang dipantau` : `Pantau ${t.title}`} title={watched.has(t.id) ? "Sedang dalam Pantauan Pengarah" : "Tambah ke Pantauan Pengarah"} onClick={() => setWatchFor(t)}><Eye className="size-3.5" /></Button>}
                      {can.editTasks && <Button size="sm" variant="ghost" aria-label={`Padam ${t.title}`} onClick={() => del(t)} className="text-red-600 hover:!bg-red-50"><Trash2 className="size-4" /></Button>}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {watchFor && <WatchForm key={watchFor.id} value={{ title: `Pantau: ${watchFor.title}`, task_id: watchFor.id, due_date: watchFor.deadline, priority: watchFor.priority }} onClose={() => setWatchFor(null)} />}
      {edit && <TaskForm key={edit.id ?? "baru"} value={edit} onClose={() => setEdit(null)} />}
    </>
  );
}
