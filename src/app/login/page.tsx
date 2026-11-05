"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Lock, User } from "lucide-react";
import { call } from "@/lib/store";
import { Button, Field, Input } from "@/components/ui";

export default function Login() {
  const router = useRouter();
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [err, setErr] = useState("");
  const [loading, setL] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setL(true);
    try { await call("POST", "/api/auth/login", { username, password }); router.replace("/"); router.refresh(); }
    catch (x) { setErr((x as Error).message); setL(false); }
  }
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-navy-900 text-white p-12 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="flex items-center gap-3"><div className="size-11 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 grid place-items-center text-navy-950"><Crown className="size-6" /></div><span className="font-bold tracking-wide">AJK COMMAND CENTER</span></div>
        <div>
          <p className="text-gold-400 text-sm font-semibold tracking-[.25em] mb-3">28 NOVEMBER 2026</p>
          <h1 className="text-4xl font-bold leading-tight">Hari Anugerah Kecemerlangan dan Apresiasi Ashabul Yamin 2026</h1>
          <p className="mt-4 text-white/70 max-w-md">Siapa yang belum buat kerja, apa yang belum selesai dan siapa yang perlu di-follow-up hari ini — semuanya di satu tempat.</p>
        </div>
        <p className="text-xs text-white/40">Sekolah Menengah Tahfiz Darul Ridzuan Tambun</p>
      </div>
      <div className="flex items-center justify-center p-6 bg-navy-50">
        <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl border border-navy-100 shadow-xl p-7 space-y-4">
          <div className="lg:hidden flex items-center gap-2 text-navy-900 font-bold"><Crown className="size-5 text-gold-500" />AJK COMMAND CENTER 2026</div>
          <div><h2 className="text-xl font-bold text-navy-900">Log Masuk</h2><p className="text-sm text-slate-500">Masukkan akaun yang diberikan oleh Pengarah.</p></div>
          <Field label="Nama pengguna"><div className="relative"><User className="size-4 absolute left-3 top-3.5 text-slate-400" /><Input className="pl-9" autoComplete="username" value={username} onChange={(e) => setU(e.target.value)} required autoFocus /></div></Field>
          <Field label="Kata laluan"><div className="relative"><Lock className="size-4 absolute left-3 top-3.5 text-slate-400" /><Input className="pl-9" type="password" autoComplete="current-password" value={password} onChange={(e) => setP(e.target.value)} required /></div></Field>
          {err && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <Button type="submit" variant="gold" loading={loading} className="w-full">Log Masuk</Button>
        </form>
      </div>
    </div>
  );
}
