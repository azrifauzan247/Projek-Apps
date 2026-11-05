"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Users, ListChecks, MessageSquareMore, BarChart3, ClipboardCheck, FileText, Settings, LogOut, Menu, X, Crown, CalendarDays } from "lucide-react";
import { useApp, call } from "@/lib/store";
import { cn } from "./ui";
import { daysToEvent, needsFollow, followRows } from "@/lib/logic";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/direktori", label: "Direktori AJK", icon: Users },
  { href: "/tugasan", label: "Pengurusan Tugasan", icon: ListChecks },
  { href: "/susulan", label: "Pusat Susulan", icon: MessageSquareMore, badge: true },
  { href: "/prestasi", label: "Prestasi Unit", icon: BarChart3 },
  { href: "/senarai-semak", label: "Senarai Semak Majlis", icon: ClipboardCheck },
  { href: "/laporan", label: "Laporan", icon: FileText },
  { href: "/tetapan", label: "Tetapan", icon: Settings },
];
const ROLE = { admin: "Pengarah / Admin", leader: "Ketua Unit", member: "Ahli AJK" } as const;

export default function Shell({ children }: { children: React.ReactNode }) {
  const { data } = useApp();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const days = daysToEvent(data);
  const followCount = data.me.role === "member" ? 0 : followRows(data).filter(needsFollow).length;
  const nav = NAV.filter((n) => data.me.role !== "member" || !["/susulan", "/laporan", "/tetapan", "/prestasi"].includes(n.href))
    .filter((n) => n.href !== "/tetapan" || data.me.role === "admin");

  async function logout() { await call("POST", "/api/auth/logout").catch(() => {}); router.replace("/login"); router.refresh(); }
  const sidebar = (
    <div className="h-full flex flex-col bg-navy-900 text-white">
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 grid place-items-center text-navy-950 shadow-lg"><Crown className="size-5" /></div>
          <div className="leading-tight"><p className="font-bold tracking-wide text-sm">AJK COMMAND</p><p className="text-gold-400 text-xs font-semibold tracking-[.2em]">CENTER 2026</p></div>
        </div>
        <div className="mt-4 rounded-xl bg-white/5 px-3 py-2.5 flex items-center gap-2.5">
          <CalendarDays className="size-4 text-gold-400 shrink-0" />
          <p className="text-xs text-white/80 leading-snug">{days > 0 ? <><b className="text-gold-400 text-sm">{days}</b> hari lagi ke majlis</> : days === 0 ? <b className="text-gold-400">Majlis hari ini!</b> : "Majlis telah berlangsung"}</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Navigasi utama">
        {nav.map(({ href, label, icon: Icon, badge }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
              className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", active ? "bg-white/10 text-white font-semibold ring-1 ring-gold-500/40" : "text-white/70 hover:bg-white/5 hover:text-white")}>
              <Icon className={cn("size-[18px]", active && "text-gold-400")} />
              <span className="flex-1">{label}</span>
              {badge && followCount > 0 && <span className="bg-gold-500 text-navy-950 text-[11px] font-bold rounded-full px-2 py-0.5">{followCount}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-gold-500/20 text-gold-400 grid place-items-center font-bold text-sm">{data.me.name.charAt(0).toUpperCase()}</div>
          <div className="min-w-0 flex-1 leading-tight"><p className="text-sm font-medium truncate">{data.me.name}</p><p className="text-[11px] text-white/50">{ROLE[data.me.role]}</p></div>
          <button onClick={logout} aria-label="Log keluar" title="Log keluar" className="p-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white cursor-pointer"><LogOut className="size-4" /></button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">{sidebar}</aside>
      <header className="lg:hidden sticky top-0 z-40 bg-navy-900 text-white flex items-center gap-3 px-4 h-14 shadow-md">
        <button onClick={() => setOpen(true)} aria-label="Buka menu" className="p-1.5 -ml-1.5 cursor-pointer"><Menu className="size-6" /></button>
        <span className="font-bold text-sm tracking-wide">AJK COMMAND <span className="text-gold-400">CENTER</span></span>
        <span className="ml-auto text-xs bg-white/10 rounded-full px-2.5 py-1"><b className="text-gold-400">{Math.max(days, 0)}</b> hari</span>
      </header>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] fade-in">
            <button onClick={() => setOpen(false)} aria-label="Tutup menu" className="absolute right-3 top-4 z-10 text-white/70 p-1 cursor-pointer"><X className="size-5" /></button>
            {sidebar}
          </div>
        </div>
      )}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto fade-in">{children}</main>
    </div>
  );
}
