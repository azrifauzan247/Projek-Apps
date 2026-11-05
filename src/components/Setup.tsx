"use client";
import { useState } from "react";
import { Check, Copy, Crown, ExternalLink } from "lucide-react";
import { clearConfig, getConfig, normalizeUrl, saveConfig } from "@/lib/repo";
import { SETUP_SQL } from "@/lib/setup-sql";
import { Button, Field, Input } from "./ui";

export default function Setup({ error, onDone }: { error: string; onDone: () => void }) {
  const existing = typeof window !== "undefined" ? getConfig() : null;
  const [url, setUrl] = useState(existing?.url ?? "");
  const [key, setKey] = useState(existing?.key ?? "");
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const missingTables = error === "SETUP_SQL";

  function connect() {
    const base = normalizeUrl(url);
    if (!base) return setErr("URL mesti seperti https://xxxx.supabase.co");
    if (key.trim().length < 30) return setErr("Kunci (anon public) tidak lengkap");
    setErr(""); clearConfig(); saveConfig({ url: base, key: key.trim() }); onDone();
  }
  async function copy() {
    try { await navigator.clipboard.writeText(SETUP_SQL); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { setErr("Tidak dapat menyalin. Pilih teks SQL dan salin secara manual."); }
  }
  return (
    <div className="min-h-screen bg-navy-50 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6"><div className="size-11 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 grid place-items-center text-navy-950"><Crown className="size-6" /></div><div><h1 className="font-bold text-navy-900 text-lg leading-tight">AJK COMMAND CENTER 2026</h1><p className="text-sm text-slate-500">Persediaan sekali sahaja (kira-kira 5 minit)</p></div></div>
        {missingTables && <p className="mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3">Sambungan berjaya, tetapi jadual pangkalan data belum dibuat. Ikut langkah 2 di bawah.</p>}
        <ol className="space-y-5 text-sm text-slate-700">
          <li className="bg-white rounded-2xl border border-navy-100 p-5">
            <p className="font-semibold text-navy-900 mb-2">1. Cipta pangkalan data percuma</p>
            <p>Daftar di <a className="text-gold-600 font-semibold inline-flex items-center gap-1" href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com <ExternalLink className="size-3" /></a> (percuma, guna akaun Google/GitHub) → <b>New project</b> → beri nama dan kata laluan pangkalan data → tunggu siap (±2 minit).</p>
          </li>
          <li className="bg-white rounded-2xl border border-navy-100 p-5">
            <p className="font-semibold text-navy-900 mb-2">2. Cipta jadual</p>
            <p className="mb-3">Dalam Supabase, buka <b>SQL Editor</b> → <b>New query</b> → tampal SQL di bawah → tekan <b>Run</b>.</p>
            <Button variant="outline" size="sm" onClick={copy}>{copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}{copied ? "Disalin" : "Salin SQL"}</Button>
            <pre className="mt-3 max-h-40 overflow-auto scroll-thin rounded-xl bg-navy-950 text-white/80 text-[11px] p-3">{SETUP_SQL}</pre>
          </li>
          <li className="bg-white rounded-2xl border border-navy-100 p-5 space-y-3">
            <p className="font-semibold text-navy-900">3. Sambungkan app</p>
            <p>Dalam Supabase: <b>Project Settings → API</b>. Salin <b>Project URL</b> dan kunci <b>anon public</b>.</p>
            <Field label="Project URL"><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://abcdxyz.supabase.co" autoComplete="off" /></Field>
            <Field label="Kunci anon public"><Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="eyJhbGciOi…" autoComplete="off" /></Field>
            {err && <p className="text-red-600 text-xs" role="alert">{err}</p>}
            {error && !missingTables && <p className="text-red-600 text-xs" role="alert">{error}</p>}
            <Button variant="gold" onClick={connect}>Sambung &amp; Mula</Button>
          </li>
        </ol>
        <p className="text-xs text-slate-400 mt-4">Selepas siap, di <b>Tetapan</b> anda akan dapat satu pautan untuk dihantar kepada AJK — mereka terus boleh guna tanpa langkah di atas.</p>
      </div>
    </div>
  );
}
