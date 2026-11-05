"use client";
import { useState } from "react";
import { FileSpreadsheet, FileText, History, Play, Trash2 } from "lucide-react";
import { useApp, call } from "@/lib/store";
import { Button, Card, CardHeader, Empty, Field, PageHeader, Select, Input, cn } from "@/components/ui";
import { buildReport, REPORT_TYPES, type Report } from "@/lib/reports";
import { exportExcel, exportPdf } from "@/lib/export";
import { fmtDateTime, todayStr } from "@/lib/logic";

export default function Laporan() {
  const { data, run, toast, confirm, can } = useApp();
  const [type, setType] = useState<string>("keseluruhan");
  const [unitId, setUnitId] = useState(String(data.units[0]?.id ?? ""));
  const [memberId, setMemberId] = useState("");
  const [endDate, setEnd] = useState(todayStr());
  const [report, setReport] = useState<Report | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [busy, setBusy] = useState<"" | "pdf" | "xlsx">("");
  const meta = REPORT_TYPES.find((t) => t.key === type)!;
  const needs = "needs" in meta ? meta.needs : undefined;

  function generate() {
    try { setReport(buildReport(data, type, { unitId: Number(unitId), memberId: Number(memberId), endDate })); setSaved(null); }
    catch (e) { toast("err", (e as Error).message); }
  }
  async function exp(kind: "pdf" | "xlsx") {
    if (!report) return;
    setBusy(kind);
    try {
      if (saved === null) {
        const r = await run(() => call<{ id: number }>("POST", "/api/r/reports", { type: report.type, title: report.title, payload: report }));
        if (r) setSaved(r.id);
      }
      await (kind === "pdf" ? exportPdf(report) : exportExcel(report));
    } catch (e) { toast("err", `Gagal mengeksport: ${(e as Error).message}`); }
    setBusy("");
  }
  async function open(id: number) {
    try { const r = await call<{ id: number; payload: Report }>("GET", `/api/reports/${id}`); setReport(r.payload); setSaved(r.id); window.scrollTo({ top: 0, behavior: "smooth" }); }
    catch (e) { toast("err", (e as Error).message); }
  }
  async function del(id: number, title: string) {
    if (!(await confirm({ title: "Padam laporan tersimpan", message: `Padam "${title}" daripada sejarah laporan?` }))) return;
    await run(() => call("DELETE", `/api/r/reports/${id}`), "Laporan dipadam");
    if (saved === id) setSaved(null);
  }

  return (
    <>
      <PageHeader title="Laporan" sub="Jana laporan dan eksport ke PDF atau Excel" />
      <div className="grid gap-5 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-1">
          <CardHeader title="Jana Laporan" />
          <div className="px-5 pb-5 space-y-4">
            <div className="space-y-2" role="radiogroup" aria-label="Jenis laporan">
              {REPORT_TYPES.map((t) => (
                <button key={t.key} role="radio" aria-checked={type === t.key} onClick={() => setType(t.key)} className={cn("w-full text-left rounded-xl border px-3.5 py-2.5 cursor-pointer transition", type === t.key ? "border-gold-500 bg-gold-50" : "border-navy-100 hover:bg-navy-50")}>
                  <p className="text-sm font-semibold text-navy-900">{t.label}</p><p className="text-xs text-slate-500">{t.desc}</p>
                </button>))}
            </div>
            {needs === "unit" && <Field label="Unit"><Select value={unitId} onChange={(e) => setUnitId(e.target.value)}>{data.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>}
            {needs === "member" && <Field label="Ahli"><Select value={memberId} onChange={(e) => setMemberId(e.target.value)}><option value="">— Pilih ahli —</option>{data.members.filter((m) => m.active).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>}
            {needs === "date" && <Field label="Minggu berakhir pada" hint="Meliputi 7 hari sehingga tarikh ini"><Input type="date" value={endDate} max={todayStr()} onChange={(e) => setEnd(e.target.value)} /></Field>}
            <Button variant="gold" className="w-full" onClick={generate}><Play className="size-4" />Jana Laporan</Button>
          </div>
        </Card>

        <Card className="lg:col-span-2 min-w-0">
          {!report ? <Empty title="Belum ada laporan dijana" sub="Pilih jenis laporan di sebelah kiri, kemudian tekan Jana Laporan." /> : (
            <>
              <CardHeader title={report.title} sub={`${report.event} · ${report.generatedAt} · ${report.scope}`}
                action={<div className="flex gap-2 shrink-0"><Button size="sm" variant="outline" loading={busy === "pdf"} onClick={() => exp("pdf")}><FileText className="size-4" />PDF</Button><Button size="sm" variant="outline" loading={busy === "xlsx"} onClick={() => exp("xlsx")}><FileSpreadsheet className="size-4" />Excel</Button></div>} />
              <div className="px-5 pb-5 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{report.summary.map(([a, b]) => <div key={a} className="rounded-xl bg-navy-50 px-3 py-2.5"><p className="text-[11px] text-slate-500">{a}</p><p className="font-semibold text-navy-900 text-sm">{b}</p></div>)}</div>
                {report.sections.map((s) => (
                  <div key={s.heading}>
                    <h4 className="text-sm font-semibold text-navy-900 mb-2">{s.heading} <span className="text-slate-400 font-normal">({s.rows.length})</span></h4>
                    <div className="overflow-x-auto scroll-thin rounded-xl border border-navy-100">
                      <table className="w-full text-xs min-w-[560px]">
                        <thead className="bg-navy-900 text-white"><tr>{s.columns.map((c) => <th key={c} className="text-left font-medium px-3 py-2 whitespace-nowrap">{c}</th>)}</tr></thead>
                        <tbody>{s.rows.length === 0 ? <tr><td colSpan={s.columns.length} className="text-center text-slate-400 py-4">Tiada rekod</td></tr> : s.rows.map((r, i) => <tr key={i} className="odd:bg-white even:bg-navy-50/60 align-top">{r.map((c, j) => <td key={j} className="px-3 py-2">{c}</td>)}</tr>)}</tbody>
                      </table>
                    </div>
                  </div>))}
                <p className="text-[11px] text-slate-400">{saved ? `Disimpan dalam sejarah laporan (#${saved}).` : "Laporan akan disimpan dalam sejarah apabila anda eksport."}</p>
              </div>
            </>)}
        </Card>
      </div>

      <Card>
        <CardHeader title={<span className="flex items-center gap-2"><History className="size-4" />Sejarah Laporan</span>} sub="Laporan yang telah dieksport — boleh dibuka dan dieksport semula" />
        <div className="px-5 pb-5">
          {data.reports.length === 0 ? <Empty title="Belum ada laporan tersimpan" /> : (
            <ul className="divide-y divide-navy-100">{data.reports.map((r) => (
              <li key={r.id} className="py-3 flex items-center gap-3"><div className="min-w-0 flex-1"><p className="text-sm font-medium text-navy-900 truncate">{r.title}</p><p className="text-xs text-slate-500">{fmtDateTime(r.created_at)} · {r.created_by}</p></div>
                <Button size="sm" variant="outline" onClick={() => open(r.id)}>Buka</Button>{can.admin && <Button size="sm" variant="ghost" className="text-red-600" aria-label={`Padam ${r.title}`} onClick={() => del(r.id, r.title)}><Trash2 className="size-4" /></Button>}</li>))}</ul>)}
        </div>
      </Card>
    </>
  );
}
