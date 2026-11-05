"use client";
import { useEffect, useId, useRef } from "react";
import clsx from "clsx";
import { Loader2, X, Inbox } from "lucide-react";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/logic";
import type { EffStatus, Priority } from "@/lib/types";

export const cn = clsx;

export function Card({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl bg-white border border-navy-100 shadow-[0_1px_2px_rgba(10,27,61,.04),0_4px_16px_rgba(10,27,61,.04)]", className)} {...p}>{children}</div>;
}
export function CardHeader({ title, sub, action }: { title: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
      <div className="min-w-0"><h3 className="font-semibold text-navy-900 leading-tight">{title}</h3>{sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}</div>
      {action}
    </div>
  );
}
export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
      <div><h1 className="text-2xl font-bold text-navy-900 tracking-tight">{title}</h1>{sub && <p className="text-sm text-slate-500 mt-1">{sub}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "gold" | "outline" | "ghost" | "danger" | "whatsapp"; size?: "sm" | "md"; loading?: boolean };
export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...p }: BtnProps) {
  const v = {
    primary: "bg-navy-900 text-white hover:bg-navy-800",
    gold: "bg-gold-500 text-navy-950 hover:bg-gold-400 font-semibold",
    outline: "border border-navy-100 bg-white text-navy-900 hover:bg-navy-50",
    ghost: "text-navy-800 hover:bg-navy-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    whatsapp: "bg-[#25D366] text-white hover:bg-[#1ebe5b] font-semibold",
  }[variant];
  return (
    <button disabled={disabled || loading} className={cn("inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer", size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm", v, className)} {...p}>
      {loading && <Loader2 className="size-4 animate-spin" />}{children}
    </button>
  );
}

const STATUS_CLS: Record<EffStatus, string> = {
  done: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  ongoing: "bg-sky-50 text-sky-700 ring-sky-200",
  pending: "bg-slate-100 text-slate-600 ring-slate-200",
  overdue: "bg-red-50 text-red-700 ring-red-200",
};
const PRI_CLS: Record<Priority, string> = {
  Low: "bg-slate-100 text-slate-600 ring-slate-200", Medium: "bg-blue-50 text-blue-700 ring-blue-200",
  High: "bg-amber-50 text-amber-700 ring-amber-200", Critical: "bg-red-50 text-red-700 ring-red-200",
};
export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap", className)}>{children}</span>;
}
export const StatusBadge = ({ s }: { s: EffStatus }) => <Badge className={STATUS_CLS[s]}>{STATUS_LABEL[s]}</Badge>;
export const PriorityBadge = ({ p }: { p: Priority }) => <Badge className={PRI_CLS[p]}>{PRIORITY_LABEL[p]}</Badge>;

export function barColor(pct: number, overdue = false) {
  if (pct >= 100) return "bg-emerald-500";
  if (overdue) return "bg-red-500";
  if (pct >= 60) return "bg-gold-500";
  if (pct >= 25) return "bg-navy-700";
  return "bg-slate-400";
}
export function Progress({ value, overdue, className, showLabel = true }: { value: number; overdue?: boolean; className?: string; showLabel?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-2 flex-1 rounded-full bg-navy-100 overflow-hidden"><div className={cn("h-full rounded-full transition-all duration-500", barColor(value, overdue))} style={{ width: `${value}%` }} /></div>
      {showLabel && <span className="text-xs font-semibold text-navy-900 tabular-nums w-9 text-right">{value}%</span>}
    </div>
  );
}

export function Spinner({ label = "Memuatkan…" }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 py-20 text-slate-500 text-sm"><Loader2 className="size-5 animate-spin text-gold-500" />{label}</div>;
}
export function Empty({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-4">
      <div className="size-12 rounded-2xl bg-navy-50 grid place-items-center text-navy-700 mb-3"><Inbox className="size-6" /></div>
      <p className="font-medium text-navy-900">{title}</p>{sub && <p className="text-sm text-slate-500 mt-1 max-w-sm">{sub}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("input,select,textarea")?.focus();
    return () => { document.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className={cn("relative bg-white w-full rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col fade-in", wide ? "sm:max-w-3xl" : "sm:max-w-xl")}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100">
          <h2 id={titleId} className="font-semibold text-navy-900">{title}</h2>
          <button onClick={onClose} aria-label="Tutup" className="p-1.5 rounded-lg hover:bg-navy-50 cursor-pointer"><X className="size-5" /></button>
        </div>
        <div className="overflow-y-auto p-5 scroll-thin">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-navy-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, error, hint, children, className }: { label: string; error?: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="block text-xs font-semibold text-navy-800 mb-1.5">{label}</span>
      {children}
      {hint && !error && <span className="block text-[11px] text-slate-500 mt-1">{hint}</span>}
      {error && <span className="block text-[11px] text-red-600 mt-1" role="alert">{error}</span>}
    </label>
  );
}
const inputCls = "w-full rounded-xl border border-navy-100 bg-white px-3.5 py-2.5 text-sm text-navy-950 placeholder:text-slate-400 focus:border-gold-500 focus:ring-2 focus:ring-gold-100 outline-none transition disabled:bg-slate-50";
export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cn(inputCls, p.className)} />;
export const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cn(inputCls, "pr-8", p.className)} />;
export const Textarea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={3} {...p} className={cn(inputCls, "resize-y", p.className)} />;
export const SearchBox = (p: React.InputHTMLAttributes<HTMLInputElement>) => <Input type="search" {...p} className={cn("min-w-0", p.className)} />;
