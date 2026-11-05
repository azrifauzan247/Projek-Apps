"use client";
import { useState } from "react";
import { Copy, Download, Link2, Save, Unplug } from "lucide-react";
import { useApp, call } from "@/lib/store";
import { Button, Card, CardHeader, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { clearConfig, exportBackup, getConfig, shareLink } from "@/lib/repo";

export default function Tetapan() {
  const { data, run, toast, confirm } = useApp();
  const [f, setF] = useState({ ...data.settings });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const cfg = getConfig();
  const link = cfg ? shareLink(cfg) : "";

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
  async function copyLink() {
    try { await navigator.clipboard.writeText(link); toast("ok", "Pautan disalin. Hantar kepada AJK melalui WhatsApp."); } catch { toast("err", "Tidak dapat menyalin. Tekan lama pada pautan dan salin."); }
  }
  async function backup() {
    try {
      const blob = new Blob([await exportBackup()], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `sandaran-ajk-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) { toast("err", (e as Error).message); }
  }
  async function disconnect() {
    if (!(await confirm({ title: "Putuskan sambungan", message: "Peranti ini tidak lagi disambungkan ke pangkalan data. Data tidak dipadam; anda boleh sambung semula dengan pautan kongsi.", confirmLabel: "Putuskan" }))) return;
    clearConfig(); window.location.reload();
  }

  return (
    <>
      <PageHeader title="Tetapan" sub="Maklumat program, templat mesej dan perkongsian" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader title={<span className="flex items-center gap-2"><Link2 className="size-4" />Pautan untuk AJK</span>} sub="Sesiapa yang ada pautan ini boleh melihat dan mengemas kini data. Hantar kepada AJK sahaja; jangan kongsi di tempat awam." />
          <div className="px-5 pb-5 space-y-3">
            <div className="flex gap-2"><Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Pautan kongsi" /><Button variant="gold" onClick={copyLink}><Copy className="size-4" />Salin</Button></div>
            <p className="text-xs text-slate-500">Pautan ini mengandungi kunci sambungan pangkalan data, jadi AJK tidak perlu buat persediaan apa-apa. Pelayar mereka akan mengingatinya.</p>
          </div>
        </Card>
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
          <CardHeader title="Sandaran & Sambungan" />
          <div className="px-5 pb-5 flex flex-wrap gap-2">
            <Button variant="outline" onClick={backup}><Download className="size-4" />Muat turun sandaran (JSON)</Button>
            <Button variant="ghost" className="text-red-600" onClick={disconnect}><Unplug className="size-4" />Putuskan sambungan peranti ini</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
