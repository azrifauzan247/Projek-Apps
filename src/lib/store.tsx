"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { AppData } from "./types";
import { Button, Modal } from "@/components/ui";

export async function call<T = unknown>(method: string, url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method, headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) });
  } catch {
    throw new Error("Tidak dapat berhubung dengan pelayan. Semak sambungan internet anda.");
  }
  if (res.status === 401 && !url.includes("/auth/login")) { window.location.href = "/login"; throw new Error("Sesi tamat. Sila log masuk semula."); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Ralat tidak diketahui.");
  return data as T;
}

interface Toast { id: number; kind: "ok" | "err"; text: string }
interface Ctx {
  data: AppData; refresh: () => Promise<void>;
  /** Jalankan mutasi: papar toast, muat semula data. Pulangkan hasil atau undefined jika gagal. */
  run: <T>(fn: () => Promise<T>, okMsg?: string) => Promise<T | undefined>;
  confirm: (o: { title: string; message: string; confirmLabel?: string }) => Promise<boolean>;
  toast: (kind: "ok" | "err", text: string) => void;
  can: { manage: boolean; editTasks: boolean; follow: boolean; admin: boolean };
}
const C = createContext<Ctx | null>(null);
export const useApp = () => { const c = useContext(C); if (!c) throw new Error("useApp di luar provider"); return c; };

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dlg, setDlg] = useState<{ title: string; message: string; confirmLabel?: string; resolve: (v: boolean) => void } | null>(null);
  const busy = useRef(0);

  const refresh = useCallback(async () => {
    try { setData(await call<AppData>("GET", "/api/data")); setError(""); } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => {
    refresh();
    // kemas kini hampir masa nyata: tinjau setiap 20s dan bila tab aktif semula
    const t = setInterval(() => { if (!document.hidden && !busy.current) refresh(); }, 20000);
    const v = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", v);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", v); };
  }, [refresh]);

  const toast = useCallback((kind: "ok" | "err", text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "err" ? 6000 : 3000);
  }, []);

  const run = useCallback(async <T,>(fn: () => Promise<T>, okMsg?: string) => {
    busy.current++;
    try { const r = await fn(); await refresh(); if (okMsg) toast("ok", okMsg); return r; }
    catch (e) { toast("err", (e as Error).message); return undefined; }
    finally { busy.current--; }
  }, [refresh, toast]);

  const confirm = useCallback((o: { title: string; message: string; confirmLabel?: string }) => new Promise<boolean>((resolve) => setDlg({ ...o, resolve })), []);

  const value = useMemo<Ctx | null>(() => {
    if (!data) return null;
    const r = data.me.role;
    return { data, refresh, run, confirm, toast, can: { admin: r === "admin", manage: r === "admin", editTasks: r !== "member", follow: r !== "member" } };
  }, [data, refresh, run, confirm, toast]);

  if (!value) {
    return error ? (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div><XCircle className="size-10 text-red-500 mx-auto mb-3" /><p className="font-semibold text-navy-900">Gagal memuatkan data</p><p className="text-sm text-slate-500 mb-4">{error}</p><Button onClick={refresh}>Cuba lagi</Button></div>
      </div>
    ) : <div className="min-h-screen grid place-items-center text-slate-500 text-sm">Memuatkan AJK Command Center…</div>;
  }
  const close = (v: boolean) => { dlg?.resolve(v); setDlg(null); };
  return (
    <C.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[60] flex flex-col gap-2 items-end pointer-events-none" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto fade-in flex items-center gap-2 rounded-xl px-4 py-3 text-sm shadow-lg text-white max-w-md ${t.kind === "ok" ? "bg-navy-900" : "bg-red-600"}`}>
            {t.kind === "ok" ? <CheckCircle2 className="size-4 text-gold-400 shrink-0" /> : <XCircle className="size-4 shrink-0" />}{t.text}
          </div>
        ))}
      </div>
      <Modal open={!!dlg} onClose={() => close(false)} title={dlg?.title ?? ""} footer={<><Button variant="outline" onClick={() => close(false)}>Batal</Button><Button variant="danger" onClick={() => close(true)}>{dlg?.confirmLabel ?? "Ya, padam"}</Button></>}>
        <div className="flex gap-3"><AlertTriangle className="size-5 text-red-500 shrink-0 mt-0.5" /><p className="text-sm text-slate-700">{dlg?.message}</p></div>
      </Modal>
    </C.Provider>
  );
}
