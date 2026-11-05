import type { AppData } from "./types";
import { addDays, daysBetween, effStatus, fmtDate, fmtDateTime, localDate, memberName, PRIORITY_LABEL, STATUS_LABEL, stats, todayStr, unitLead, unitName, unitTasks } from "./logic";
import type { Task } from "./types";

export interface ReportSection { heading: string; columns: string[]; rows: string[][] }
export interface Report {
  type: string; title: string; event: string; generatedAt: string; scope: string;
  summary: [string, string][]; sections: ReportSection[];
}
export const REPORT_TYPES = [
  { key: "keseluruhan", label: "Laporan Persiapan Keseluruhan", desc: "Ringkasan seluruh persiapan majlis dan prestasi setiap unit" },
  { key: "unit", label: "Laporan Unit", desc: "Butiran ahli dan tugasan bagi satu unit", needs: "unit" },
  { key: "ahli", label: "Laporan Tugasan Ahli", desc: "Semua tugasan dan susulan bagi seorang ahli", needs: "member" },
  { key: "tertunggak", label: "Laporan Tugasan Tertunggak", desc: "Semua tugasan yang belum selesai" },
  { key: "lewat", label: "Laporan Tugasan Lewat", desc: "Tugasan melepasi tarikh akhir" },
  { key: "mingguan", label: "Laporan Kemajuan Mingguan", desc: "Aktiviti dan kemajuan 7 hari terakhir", needs: "date" },
] as const;

const taskRow = (d: AppData, t: Task, today: string): string[] => [
  unitName(d, t.unit_id), t.title, memberName(d, t.member_id), PRIORITY_LABEL[t.priority],
  t.deadline ? fmtDate(t.deadline) : "Belum ditetapkan", STATUS_LABEL[effStatus(t, today)], `${t.progress}%`,
];
const TASK_COLS = ["Unit", "Tugasan", "Penanggungjawab", "Keutamaan", "Tarikh Akhir", "Status", "Siap"];
const summaryOf = (tasks: Task[]): [string, string][] => {
  const s = stats(tasks);
  return [["Jumlah tugasan", String(s.total)], ["Selesai", String(s.done)], ["Sedang berjalan", String(s.ongoing)], ["Belum mula", String(s.pending)], ["Lewat tempoh", String(s.overdue)], ["Peratus siap", `${s.pct}%`]];
};

export function buildReport(d: AppData, type: string, p: { unitId?: number; memberId?: number; endDate?: string }): Report {
  const today = todayStr();
  const days = daysBetween(today, d.settings.event_date);
  const base = { type, event: d.settings.event_name, generatedAt: fmtDateTime(new Date().toISOString()), scope: "" };
  const eventInfo: [string, string][] = [["Tarikh majlis", fmtDate(d.settings.event_date)], ["Hari ke majlis", String(Math.max(days, 0))]];

  switch (type) {
    case "keseluruhan": {
      return { ...base, title: "Laporan Persiapan Keseluruhan", scope: "Semua unit",
        summary: [...eventInfo, ["Jumlah unit", String(d.units.length)], ["Jumlah AJK aktif", String(d.members.filter((m) => m.active).length)], ...summaryOf(d.tasks), ["Senarai semak majlis", `${d.checklist.filter((c) => c.done).length}/${d.checklist.length}`]],
        sections: [
          { heading: "Prestasi mengikut unit", columns: ["Unit", "Ketua", "Jumlah", "Selesai", "Berjalan", "Belum", "Lewat", "Siap"],
            rows: d.units.map((u) => { const s = stats(unitTasks(d, u)); return [u.name, unitLead(d, u.id)?.name ?? "-", s.total, s.done, s.ongoing, s.pending, s.overdue, `${s.pct}%`].map(String); }) },
          { heading: "Semua tugasan", columns: TASK_COLS, rows: d.tasks.map((t) => taskRow(d, t, today)) },
          { heading: "Senarai semak majlis", columns: ["Kategori", "Item", "Status", "Ditanda"], rows: d.checklist.map((c) => [c.category, c.title, c.done ? "Siap" : "Belum", c.done ? `${fmtDateTime(c.done_at)} (${c.done_by})` : "-"]) },
        ] };
    }
    case "unit": {
      const u = d.units.find((x) => x.id === p.unitId);
      if (!u) throw new Error("Pilih unit.");
      const ts = unitTasks(d, u);
      return { ...base, title: `Laporan Unit: ${u.name}`, scope: u.name,
        summary: [["Ketua unit", unitLead(d, u.id)?.name ?? "-"], ...summaryOf(ts)],
        sections: [
          { heading: "Ahli unit", columns: ["Nama", "Jawatan", "No. telefon", "Tugasan", "Selesai", "Lewat"],
            rows: d.members.filter((m) => m.unit_id === u.id && m.active).map((m) => { const s = stats(ts.filter((t) => t.member_id === m.id)); return [m.name, m.position, m.phone || "-", s.total, s.done, s.overdue].map(String); }) },
          { heading: "Tugasan unit", columns: TASK_COLS, rows: ts.map((t) => taskRow(d, t, today)) },
        ] };
    }
    case "ahli": {
      const m = d.members.find((x) => x.id === p.memberId);
      if (!m) throw new Error("Pilih ahli.");
      const ts = d.tasks.filter((t) => t.member_id === m.id);
      return { ...base, title: `Laporan Tugasan Ahli: ${m.name}`, scope: `${m.name} (${unitName(d, m.unit_id)})`,
        summary: [["Nama", m.name], ["Unit", unitName(d, m.unit_id)], ["Jawatan", m.position], ...summaryOf(ts)],
        sections: [
          { heading: "Tugasan", columns: TASK_COLS, rows: ts.map((t) => taskRow(d, t, today)) },
          { heading: "Sejarah susulan", columns: ["Tarikh", "Kaedah", "Perbincangan", "Respons", "Tindakan", "Susulan seterusnya"],
            rows: d.followups.filter((f) => f.member_id === m.id).map((f) => [fmtDateTime(f.contacted_at), f.method, f.summary, f.responded ? f.response : "Belum membalas", f.action_required || "-", fmtDate(f.next_followup)]) },
        ] };
    }
    case "tertunggak": {
      const ts = d.tasks.filter((t) => t.status !== "done").sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));
      return { ...base, title: "Laporan Tugasan Tertunggak", scope: "Semua tugasan belum selesai", summary: [...eventInfo, ...summaryOf(ts)], sections: [{ heading: "Tugasan belum selesai", columns: TASK_COLS, rows: ts.map((t) => taskRow(d, t, today)) }] };
    }
    case "lewat": {
      const ts = d.tasks.filter((t) => effStatus(t, today) === "overdue").sort((a, b) => a.deadline!.localeCompare(b.deadline!));
      return { ...base, title: "Laporan Tugasan Lewat", scope: "Tugasan melepasi tarikh akhir", summary: [...eventInfo, ["Jumlah tugasan lewat", String(ts.length)]],
        sections: [{ heading: "Tugasan lewat tempoh", columns: [...TASK_COLS, "Lewat (hari)"], rows: ts.map((t) => [...taskRow(d, t, today), String(daysBetween(t.deadline!, today))]) }] };
    }
    case "mingguan": {
      const end = p.endDate || today;
      const start = addDays(end, -6);
      const inRange = (iso: string) => { const x = localDate(iso); return x >= start && x <= end; };
      const completed = d.tasks.filter((t) => t.completed_at && inRange(t.completed_at));
      const lastLog = new Map<number, { at: string; progress: number; status: string; by: string }>();
      for (const l of d.taskLog) if (inRange(l.at)) lastLog.set(l.task_id, { at: l.at, progress: l.progress, status: l.status, by: l.by_user });
      const fus = d.followups.filter((f) => f.contacted_at.slice(0, 10) >= start && f.contacted_at.slice(0, 10) <= end);
      const upcoming = d.tasks.filter((t) => t.status !== "done" && t.deadline && t.deadline > end && t.deadline <= addDays(end, 7));
      return { ...base, title: "Laporan Kemajuan Mingguan", scope: `${fmtDate(start)} - ${fmtDate(end)}`,
        summary: [["Tempoh", `${fmtDate(start)} - ${fmtDate(end)}`], ...eventInfo, ["Tugasan disiapkan minggu ini", String(completed.length)], ["Tugasan dikemas kini", String(lastLog.size)], ["Susulan dibuat", String(fus.length)], ...summaryOf(d.tasks)],
        sections: [
          { heading: "Tugasan disiapkan", columns: TASK_COLS, rows: completed.map((t) => taskRow(d, t, today)) },
          { heading: "Kemajuan dikemas kini", columns: ["Tugasan", "Unit", "Penanggungjawab", "Status", "Siap", "Kemas kini", "Oleh"],
            rows: [...lastLog.entries()].map(([id, l]) => { const t = d.tasks.find((x) => x.id === id); return t ? [t.title, unitName(d, t.unit_id), memberName(d, t.member_id), STATUS_LABEL[effStatus(t, today)], `${l.progress}%`, fmtDateTime(l.at), l.by] : []; }).filter((r) => r.length) },
          { heading: "Susulan minggu ini", columns: ["Tarikh", "Ahli", "Kaedah", "Perbincangan", "Respons"], rows: fus.map((f) => [fmtDateTime(f.contacted_at), memberName(d, f.member_id), f.method, f.summary, f.responded ? f.response : "Belum membalas"]) },
          { heading: "Akan tamat tempoh minggu depan", columns: TASK_COLS, rows: upcoming.map((t) => taskRow(d, t, today)) },
        ] };
    }
  }
  throw new Error("Jenis laporan tidak dikenali.");
}
