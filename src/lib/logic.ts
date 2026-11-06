import type { AppData, EffStatus, Member, Task, Unit } from "./types";

export function todayStr(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function addDays(date: string, n: number) {
  const d = new Date(date + "T00:00:00"); d.setDate(d.getDate() + n); return todayStr(d);
}
export function daysBetween(a: string, b: string) {
  return Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000);
}
/** tarikh/masa ISO UTC (dari pangkalan data) -> tarikh tempatan YYYY-MM-DD */
export function localDate(iso: string) { return todayStr(new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z")); }
export function daysSince(iso: string) { return daysBetween(localDate(iso), todayStr()); }

export const MONTHS = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];
export function fmtDate(s?: string | null) {
  if (!s) return "—";
  const d = s.length === 10 ? new Date(s + "T00:00:00") : new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
export function fmtDateTime(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s.includes("T") || s.length === 10 ? s : s.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return "—";
  return `${fmtDate(s)}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export const STATUS_LABEL: Record<EffStatus, string> = { done: "Selesai", ongoing: "Sedang Berjalan", pending: "Belum Mula", overdue: "Lewat Tempoh" };
export const PRIORITY_LABEL = { Low: "Rendah", Medium: "Sederhana", High: "Tinggi", Critical: "Kritikal" } as const;
export const PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;

export function effStatus(t: Task, today = todayStr()): EffStatus {
  if (t.status === "done") return "done";
  if (t.deadline && t.deadline < today) return "overdue";
  return t.status;
}
export const isOpen = (t: Task) => t.status !== "done";

export interface Stats { total: number; done: number; ongoing: number; pending: number; overdue: number; pct: number }
export function stats(tasks: Task[]): Stats {
  const today = todayStr();
  const s = { total: tasks.length, done: 0, ongoing: 0, pending: 0, overdue: 0, pct: 0 };
  let sum = 0;
  for (const t of tasks) { s[effStatus(t, today)]++; sum += t.progress; }
  s.pct = s.total ? Math.round(sum / s.total) : 0;
  return s;
}

export function unitLead(d: AppData, unitId: number): Member | undefined {
  const ms = d.members.filter((m) => m.unit_id === unitId && m.active);
  return ms.find((m) => /^ketua|^pengarah$|^penasihat/i.test(m.position)) ?? ms[0];
}
export const activeMembers = (d: AppData) => d.members.filter((m) => m.active);
export const memberName = (d: AppData, id: number | null) => d.members.find((m) => m.id === id)?.name ?? "Belum ditugaskan";
export const unitName = (d: AppData, id: number | null) => d.units.find((u) => u.id === id)?.name ?? "Tiada unit";
export const unitTasks = (d: AppData, u: Unit) => d.tasks.filter((t) => t.unit_id === u.id);

export function daysToEvent(d: AppData) { return daysBetween(todayStr(), d.settings.event_date); }

/** Unit yang perlukan perhatian segera */
export function unitNeedsAttention(d: AppData, u: Unit) {
  const s = stats(unitTasks(d, u));
  return s.overdue > 0 || (s.total > 0 && s.pct < 25 && daysToEvent(d) <= 14);
}

export interface FollowReason { key: string; label: string; weight: number }
export interface FollowRow { member: Member; tasks: Task[]; reasons: FollowReason[]; score: number; last?: AppData["followups"][number]; lastDate: string | null; next: string | null; lastUpdate: string | null }

export function followRows(d: AppData): FollowRow[] {
  const today = todayStr();
  const stale = Number(d.settings.stale_days) || 7;
  const rows: FollowRow[] = [];
  for (const m of activeMembers(d)) {
    const open = d.tasks.filter((t) => t.member_id === m.id && isOpen(t));
    if (!open.length) continue;
    const fu = d.followups.filter((f) => f.member_id === m.id); // sudah disusun terbaru dahulu
    const last = fu[0];
    const reasons: FollowReason[] = [];
    const overdue = open.filter((t) => effStatus(t, today) === "overdue");
    if (overdue.length) reasons.push({ key: "overdue", label: `${overdue.length} tugasan lewat`, weight: 100 });
    if (last && !last.responded) reasons.push({ key: "noresp", label: "Belum membalas", weight: 60 });
    const nextDue = !!last?.next_followup && last.next_followup <= today;
    if (nextDue) reasons.push({ key: "due", label: "Tarikh susulan tiba", weight: 70 });
    const lastUpdate = open.map((t) => t.updated_at).sort().pop() ?? null;
    if (lastUpdate && daysSince(lastUpdate) >= stale) reasons.push({ key: "stale", label: `Tiada kemas kini ${daysSince(lastUpdate)} hari`, weight: 50 });
    if (!last) reasons.push({ key: "never", label: "Belum pernah di-follow-up", weight: 20 });
    const crit = open.some((t) => t.priority === "Critical" || t.priority === "High") ? 5 : 0;
    rows.push({ member: m, tasks: open, reasons, score: reasons.reduce((a, r) => a + r.weight, 0) + crit, last, lastDate: last?.contacted_at ?? null, next: last?.next_followup ?? null, lastUpdate });
  }
  return rows.sort((a, b) => b.score - a.score);
}
/** Perlukan tindakan (sebab selain "belum pernah") */
export const needsFollow = (r: FollowRow) => r.reasons.length > 0;

export interface Attention {
  overdue: Task[]; soon: Task[]; staleUnits: { unit: Unit; days: number | null }[]; members: FollowRow[]; critical: Task[];
  checklistPending: number; checklistTotal: number;
}
export function attention(d: AppData): Attention {
  const today = todayStr();
  const soonDays = Number(d.settings.soon_days) || 3;
  const stale = Number(d.settings.stale_days) || 7;
  const open = d.tasks.filter(isOpen);
  const byDeadline = (a: Task, b: Task) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999");
  const overdue = open.filter((t) => effStatus(t, today) === "overdue").sort(byDeadline);
  const soon = open.filter((t) => t.deadline && t.deadline >= today && daysBetween(today, t.deadline) <= soonDays).sort(byDeadline);
  const staleUnits = d.units
    .map((unit) => {
      const ut = unitTasks(d, unit).filter(isOpen);
      if (!ut.length) return null;
      const last = ut.map((t) => t.updated_at).sort().pop()!;
      const days = daysSince(last);
      return days >= stale ? { unit, days } : null;
    })
    .filter((x): x is { unit: Unit; days: number } => !!x);
  const members = followRows(d).filter(needsFollow);
  const critical = open.filter((t) => t.priority === "Critical").sort((a, b) => a.progress - b.progress);
  return { overdue, soon, staleUnits, members, critical, checklistPending: d.checklist.filter((c) => !c.done).length, checklistTotal: d.checklist.length };
}

/** Salin mesej WhatsApp */
export function buildWhatsApp(d: AppData, m: Member, task?: Task | null, others: Task[] = []) {
  const unit = unitName(d, m.unit_id);
  const unitLabel = m.unit_id ? `Unit ${unit}` : "AJK";
  const tpl = d.settings.wa_template;
  let tugasan = task ? task.title.charAt(0).toLowerCase() + task.title.slice(1) : "persiapan tugasan anda";
  if (!task && others.length) tugasan = others.slice(0, 3).map((t) => t.title).join(", ");
  const tarikh = task?.deadline ? `\nTarikh akhir tugasan ini ialah ${fmtDate(task.deadline)}.` : "";
  return tpl
    .replaceAll("{nama}", m.name).replaceAll("{unit}", unitLabel).replaceAll("{program}", d.settings.event_name.replace(/^Hari Anugerah Kecemerlangan dan Apresiasi /i, "Hari Anugerah "))
    .replaceAll("{tugasan}", tugasan).replaceAll("{tarikh}", tarikh);
}
/** Nombor Malaysia -> format antarabangsa wa.me */
export function waNumber(phone: string) {
  let n = phone.replace(/[^0-9]/g, "");
  if (!n) return "";
  if (n.startsWith("00")) n = n.slice(2);
  else if (n.startsWith("0")) n = "60" + n.slice(1);
  return n;
}

/** Item pantauan yang perlu perhatian: belum siap dan (tarikh sudah/hampir tiba, atau tugasan berkaitan lewat) */
export function watchUrgent(d: AppData) {
  const today = todayStr();
  const soon = Number(d.settings.soon_days) || 3;
  return (d.watch ?? []).filter((w) => {
    if (w.done) return false;
    const task = w.task_id ? d.tasks.find((t) => t.id === w.task_id) : undefined;
    const dueSoon = !!w.due_date && daysBetween(today, w.due_date) <= soon;
    const taskLate = !!task && effStatus(task, today) === "overdue";
    return dueSoon || taskLate;
  });
}
