import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AppData, Me } from "./types";
import { SEED_UNITS, SEED_TASKS, SEED_CHECKLIST, DEFAULT_SETTINGS } from "./seed-data";

// ───────────── Konfigurasi sambungan ─────────────
export interface Config { url: string; key: string }
const CFG_KEY = "ajk_cfg";
const WHO_KEY = "ajk_who";
const safe = <T,>(fn: () => T, d: T): T => { try { return fn(); } catch { return d; } };

export function getConfig(): Config | null {
  if (typeof window === "undefined") return null;
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL, envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // pautan kongsi: #k=<base64 json>
  const m = window.location.hash.match(/[#&]k=([^&]+)/);
  if (m) {
    const c = safe(() => JSON.parse(atob(decodeURIComponent(m[1]).replace(/-/g, "+").replace(/_/g, "/"))) as Config, null);
    if (c?.url && c?.key) { saveConfig(c); history.replaceState(null, "", window.location.pathname + window.location.search); return c; }
  }
  const stored = safe(() => JSON.parse(localStorage.getItem(CFG_KEY) || "null") as Config | null, null);
  if (stored?.url && stored?.key) return stored;
  return envUrl && envKey ? { url: envUrl, key: envKey } : null;
}
export function saveConfig(c: Config) { safe(() => localStorage.setItem(CFG_KEY, JSON.stringify(c)), undefined); client = null; }
export function clearConfig() { safe(() => localStorage.removeItem(CFG_KEY), undefined); client = null; }
export function shareLink(c: Config) {
  const b = btoa(JSON.stringify(c)).replace(/\+/g, "-").replace(/\//g, "_");
  return `${window.location.origin}${window.location.pathname}#k=${encodeURIComponent(b)}`;
}
export const getWho = () => safe(() => localStorage.getItem(WHO_KEY), null);
export const setWho = (n: string) => safe(() => localStorage.setItem(WHO_KEY, n), undefined);

let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (client) return client;
  const c = getConfig();
  if (!c) throw new Error("NO_CONFIG");
  client = createClient(c.url.replace(/\/+$/, ""), c.key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
/** Untuk ujian: gantikan klien */
export function __setClient(c: SupabaseClient | null) { client = c; }

// ───────────── Pembantu ─────────────
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
function friendly(e: { message?: string; code?: string }) {
  const m = e.message || "";
  if (e.code === "PGRST205" || e.code === "42P01" || /schema cache|does not exist/i.test(m)) return "SETUP_SQL";
  if (/Failed to fetch|NetworkError|fetch failed|Load failed/i.test(m)) return "Tidak dapat berhubung dengan pangkalan data. Semak sambungan internet anda.";
  if (e.code === "23505") return "Data dengan nilai ini sudah wujud.";
  if (/JWT|apikey|Invalid API key/i.test(m)) return "Kunci Supabase tidak sah. Semak tetapan sambungan.";
  return m || "Ralat tidak diketahui.";
}
async function q<T = Row[]>(p: PromiseLike<{ data: T | null; error: { message: string; code?: string } | null }>): Promise<T> {
  const r = await p;
  if (r.error) throw new Error(friendly(r.error));
  return r.data as T;
}
const now = () => new Date().toISOString();
const who = () => getWho() || "Pengarah";
const bad = (m: string) => new Error(m);

// ───────────── Skema pengesahan ─────────────
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tarikh tidak sah").nullable().optional().or(z.literal("").transform(() => null));
const str = (max = 2000) => z.string().trim().max(max);
const req = (label: string, max = 200) => z.string().trim().min(1, `${label} diperlukan`).max(max);
const id = z.coerce.number().int().positive();
const nid = z.preprocess((v) => (v === "" || v === undefined ? null : v), z.coerce.number().int().positive().nullable());
const phone = z.string().trim().regex(/^(\+?[0-9][0-9 \-]{7,17})?$/, "No. telefon tidak sah").default("");

export const UnitSchema = z.object({ name: req("Nama unit"), description: str(500).default("") });
export const MemberSchema = z.object({ name: req("Nama"), unit_id: nid, position: req("Jawatan", 80).default("Ahli"), phone, extra_resp: str(1000).default(""), active: z.coerce.number().int().min(0).max(1).default(1) });
export const TaskSchema = z.object({
  title: req("Tajuk tugasan", 200), description: str().default(""), unit_id: nid, member_id: nid,
  priority: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"), start_date: date, deadline: date,
  status: z.enum(["pending", "ongoing", "done"]).default("pending"), progress: z.coerce.number().int().min(0).max(100).default(0), notes: str(4000).default(""),
}).refine((t) => !t.start_date || !t.deadline || t.deadline >= t.start_date, { message: "Tarikh akhir mesti selepas tarikh mula", path: ["deadline"] });
export const FollowupSchema = z.object({
  member_id: id, task_id: nid, contacted_at: req("Tarikh & masa", 40),
  method: z.enum(["WhatsApp", "Panggilan", "Bersemuka", "Mesyuarat", "Lain-lain"]).default("WhatsApp"),
  summary: str().default(""), responded: z.coerce.number().int().min(0).max(1).default(0), response: str().default(""), action_required: str().default(""), next_followup: date,
});
export const ChecklistSchema = z.object({ category: req("Kategori", 100), title: req("Tajuk", 200) });
export const SettingsSchema = z.object({
  event_name: z.string().trim().min(1, "Nama program diperlukan").max(200),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarikh program tidak sah"),
  venue: z.string().trim().max(200), director: z.string().trim().max(200),
  stale_days: z.coerce.number().int().min(1).max(60), soon_days: z.coerce.number().int().min(1).max(30),
  wa_template: z.string().trim().min(10, "Templat mesej terlalu pendek").max(3000),
});
export const WatchSchema = z.object({
  title: req("Tajuk pantauan", 200), notes: str(4000).default(""), task_id: nid,
  owner: z.enum(["Pengarah", "Timbalan Pengarah", "Berdua"]).default("Berdua"),
  due_date: date, priority: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
});
type TaskIn = z.infer<typeof TaskSchema>;

export function zodMessage(e: unknown): string {
  if (e instanceof z.ZodError) return e.issues.map((i) => `${i.path.join(".") || "data"}: ${i.message}`).join("; ");
  return (e as Error).message;
}

// ───────────── Peraturan tugasan ─────────────
export function normalize(t: TaskIn, prev?: { status: string; progress: number }) {
  let { status, progress } = t;
  if (prev && status === prev.status && progress !== prev.progress) {
    status = progress >= 100 ? "done" : progress > 0 ? "ongoing" : status === "done" ? "pending" : status;
  } else if (prev && status !== prev.status) {
    if (status === "done") progress = 100;
    else if (status === "pending") progress = 0;
    else if (status === "ongoing" && (progress === 0 || progress === 100)) progress = prev.progress > 0 && prev.progress < 100 ? prev.progress : 50;
  } else if (!prev) {
    if (status === "done") progress = 100;
    else if (progress >= 100) status = "done";
    else if (progress > 0 && status === "pending") status = "ongoing";
  }
  if (progress >= 100) { status = "done"; progress = 100; }
  return { ...t, status, progress };
}
async function logTask(taskId: number, status: string, progress: number) {
  await q(sb().from("task_log").insert({ task_id: taskId, at: now(), status, progress, by_user: who() }));
}
async function checkMember(unit_id: number | null, member_id: number | null) {
  if (member_id == null) return;
  const m = await q<Row[]>(sb().from("members").select("unit_id").eq("id", member_id));
  if (!m.length) throw bad("Ahli yang dipilih tidak wujud.");
  if (unit_id != null && m[0].unit_id !== unit_id) throw bad("Ahli yang dipilih bukan dalam unit tugasan ini.");
}
const one = async (table: string, rid: number) => (await q<Row[]>(sb().from(table).select("*").eq("id", rid)))[0];
const nextSort = async (table: string) => { const r = await q<Row[]>(sb().from(table).select("sort").order("sort", { ascending: false }).limit(1)); return (r[0]?.sort ?? 0) + 1; };
const created = async (table: string, row: Row) => ({ id: Number((await q<Row[]>(sb().from(table).insert(row).select("id")))[0].id) });
const ok = { ok: true };

// ───────────── Sumber (CRUD) ─────────────
type Res = { create(b: unknown): Promise<unknown>; update(id: number, b: unknown): Promise<unknown>; remove(id: number): Promise<unknown> };
const resources: Record<string, Res> = {
  units: {
    async create(b) { const d = UnitSchema.parse(b); return created("units", { ...d, sort: await nextSort("units") }); },
    async update(rid, b) { const d = UnitSchema.parse(b); await q(sb().from("units").update(d).eq("id", rid)); return ok; },
    async remove(rid) {
      const [m, t] = await Promise.all([q<Row[]>(sb().from("members").select("id").eq("unit_id", rid).limit(1)), q<Row[]>(sb().from("tasks").select("id").eq("unit_id", rid).limit(1))]);
      if (m.length || t.length) throw bad("Unit masih mempunyai ahli atau tugasan. Pindahkan atau padam dahulu.");
      await q(sb().from("units").delete().eq("id", rid)); return ok;
    },
  },
  members: {
    async create(b) { const d = MemberSchema.parse(b); return created("members", { ...d, sort: await nextSort("members"), created_at: now() }); },
    async update(rid, b) {
      const d = MemberSchema.parse(b);
      const old = await one("members", rid); if (!old) throw bad("Rekod tidak ditemui.");
      await q(sb().from("members").update(d).eq("id", rid));
      if (old.unit_id !== d.unit_id) await q(sb().from("tasks").update({ unit_id: d.unit_id, updated_at: now() }).eq("member_id", rid).neq("status", "done"));
      return ok;
    },
    async remove(rid) { await q(sb().from("members").delete().eq("id", rid)); return ok; },
  },
  tasks: {
    async create(b) {
      const d = TaskSchema.parse(b);
      await checkMember(d.unit_id, d.member_id);
      const n = normalize(d); const t = now();
      const r = await created("tasks", { ...n, start_date: n.start_date ?? null, deadline: n.deadline ?? null, is_draft: 0, completed_at: n.status === "done" ? t : null, created_at: t, updated_at: t });
      await logTask(r.id, n.status, n.progress); return r;
    },
    async update(rid, b) {
      const old = await one("tasks", rid); if (!old) throw bad("Rekod tidak ditemui.");
      const d = TaskSchema.parse(b);
      await checkMember(d.unit_id, d.member_id);
      const n = normalize(d, old as { status: string; progress: number }); const t = now();
      await q(sb().from("tasks").update({ ...n, start_date: n.start_date ?? null, deadline: n.deadline ?? null, is_draft: 0, completed_at: n.status === "done" ? old.completed_at ?? t : null, updated_at: t }).eq("id", rid));
      if (n.status !== old.status || n.progress !== old.progress) await logTask(rid, n.status, n.progress);
      return ok;
    },
    async remove(rid) {
      const files = await q<Row[]>(sb().from("attachments").select("stored").eq("task_id", rid));
      if (files.length) await sb().storage.from("lampiran").remove(files.map((f) => f.stored));
      await q(sb().from("tasks").delete().eq("id", rid)); return ok;
    },
  },
  followups: {
    async create(b) {
      const d = FollowupSchema.parse(b);
      if (!(await one("members", d.member_id))) throw bad("Ahli tidak wujud.");
      return created("followups", { ...d, next_followup: d.next_followup ?? null, created_by: who(), created_at: now() });
    },
    async update(rid, b) { const d = FollowupSchema.parse(b); await q(sb().from("followups").update({ ...d, next_followup: d.next_followup ?? null }).eq("id", rid)); return ok; },
    async remove(rid) { await q(sb().from("followups").delete().eq("id", rid)); return ok; },
  },
  checklist: {
    async create(b) { const d = ChecklistSchema.parse(b); return created("checklist", { ...d, sort: await nextSort("checklist") }); },
    async update(rid, b) {
      const bb = b as { done?: unknown };
      if (typeof bb.done === "boolean") { await q(sb().from("checklist").update({ done: bb.done ? 1 : 0, done_at: bb.done ? now() : null, done_by: bb.done ? who() : "" }).eq("id", rid)); return ok; }
      const d = ChecklistSchema.parse(b); await q(sb().from("checklist").update(d).eq("id", rid)); return ok;
    },
    async remove(rid) { await q(sb().from("checklist").delete().eq("id", rid)); return ok; },
  },
  watch: {
    async create(b) { const d = WatchSchema.parse(b); const t = now(); return created("watch_items", { ...d, due_date: d.due_date ?? null, created_by: who(), created_at: t, updated_at: t }); },
    async update(rid, b) {
      const bb = b as { done?: unknown };
      if (typeof bb.done === "boolean") { await q(sb().from("watch_items").update({ done: bb.done ? 1 : 0, done_at: bb.done ? now() : null, done_by: bb.done ? who() : "", updated_at: now() }).eq("id", rid)); return ok; }
      const d = WatchSchema.parse(b); await q(sb().from("watch_items").update({ ...d, due_date: d.due_date ?? null, updated_at: now() }).eq("id", rid)); return ok;
    },
    async remove(rid) { await q(sb().from("watch_items").delete().eq("id", rid)); return ok; },
  },
  reports: {
    async create(b) {
      const d = z.object({ type: req("Jenis", 40), title: req("Tajuk", 200), payload: z.unknown() }).parse(b);
      return created("reports", { type: d.type, title: d.title, payload: d.payload, created_by: who(), created_at: now() });
    },
    async update() { throw bad("Tidak dibenarkan."); },
    async remove(rid) { await q(sb().from("reports").delete().eq("id", rid)); return ok; },
  },
};

// ───────────── Lampiran ─────────────
export const MAX_UPLOAD = 10 * 1024 * 1024;
async function uploadAttachment(taskId: number, fd: FormData) {
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) throw bad("Pilih fail untuk dimuat naik.");
  if (file.size > MAX_UPLOAD) throw bad("Fail melebihi had 10MB.");
  if (!(await one("tasks", taskId))) throw bad("Tugasan tidak ditemui.");
  const ext = (file.name.match(/\.[A-Za-z0-9]{1,10}$/) || [""])[0];
  const stored = `${taskId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const up = await sb().storage.from("lampiran").upload(stored, file, { contentType: file.type || "application/octet-stream" });
  if (up.error) throw new Error(friendly(up.error));
  await q(sb().from("attachments").insert({ task_id: taskId, name: file.name.slice(0, 200), stored, size: file.size, mime: file.type || "application/octet-stream", created_at: now() }));
  await q(sb().from("tasks").update({ updated_at: now() }).eq("id", taskId));
  return ok;
}
async function deleteAttachment(rid: number) {
  const a = await one("attachments", rid); if (!a) throw bad("Lampiran tidak ditemui.");
  await sb().storage.from("lampiran").remove([a.stored]);
  await q(sb().from("attachments").delete().eq("id", rid)); return ok;
}

// ───────────── Muat semua data (+ seed kali pertama) ─────────────
async function seedIfEmpty() {
  const s = await q<Row[]>(sb().from("settings").select("key").eq("key", "seeded"));
  if (s.length) return;
  // kunci primer menghalang dua peranti menyemai serentak
  const lock = await sb().from("settings").insert({ key: "seeded", value: now() });
  if (lock.error) { if (lock.error.code === "23505") return; throw new Error(friendly(lock.error)); }
  const t = now();
  await q(sb().from("settings").upsert(Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ key, value }))));
  const units = await q<Row[]>(sb().from("units").insert(SEED_UNITS.map((u, i) => ({ name: u.name, description: u.description ?? "", sort: i + 1 }))).select("id,name"));
  const unitId = Object.fromEntries(units.map((u) => [u.name, u.id]));
  const rows = SEED_UNITS.flatMap((u) => u.members.map((m, i) => ({ name: m.name, unit_id: unitId[u.name], position: m.position, extra_resp: m.extra ?? "", phone: m.phone ?? "", sort: i + 1, created_at: t, _u: u.name })));
  const mem = await q<Row[]>(sb().from("members").insert(rows.map(({ _u, ...r }) => { void _u; return r; })).select("id,name,unit_id"));
  const memId = (unit: string, name: string) => mem.find((m) => m.unit_id === unitId[unit] && m.name === name)!.id;
  await q(sb().from("tasks").insert(SEED_TASKS.map((tk) => {
    const unit = SEED_UNITS.find((u) => u.name === tk.unit)!;
    const lead = unit.members.find((m) => m.position.startsWith("Ketua") || m.position === "Pengarah") ?? unit.members[0];
    return { title: tk.title, description: tk.description, unit_id: unitId[tk.unit], member_id: memId(tk.unit, lead.name), priority: tk.priority, deadline: tk.deadline, status: "pending", progress: 0, is_draft: 1, notes: "Tugasan permulaan (draf) dengan tarikh akhir cadangan – sila semak dengan kertas cadangan rasmi.", created_at: t, updated_at: t };
  })));
  let n = 0;
  await q(sb().from("checklist").insert(SEED_CHECKLIST.flatMap(([category, items]) => items.map((title) => ({ category, title, sort: ++n })))));
}

async function loadAll(): Promise<AppData> {
  await seedIfEmpty();
  const since = new Date(Date.now() - 60 * 86400_000).toISOString();
  const [units, members, tasks, attachments, taskLog, followups, checklist, reports, settingRows] = await Promise.all([
    q<Row[]>(sb().from("units").select("*").order("sort").order("id")),
    q<Row[]>(sb().from("members").select("*").order("sort").order("id")),
    q<Row[]>(sb().from("tasks").select("*").order("id")),
    q<Row[]>(sb().from("attachments").select("*").order("id")),
    q<Row[]>(sb().from("task_log").select("task_id,at,status,progress,by_user").gte("at", since).order("at")),
    q<Row[]>(sb().from("followups").select("*").order("contacted_at", { ascending: false }).order("id", { ascending: false })),
    q<Row[]>(sb().from("checklist").select("*").order("sort").order("id")),
    q<Row[]>(sb().from("reports").select("id,type,title,created_by,created_at").order("id", { ascending: false }).limit(100)),
    q<Row[]>(sb().from("settings").select("key,value")),
  ]);
  // jadual pantauan mungkin belum dibuat; jangan gagalkan seluruh app
  let watch: Row[] = []; let watchReady = true;
  try { watch = await q<Row[]>(sb().from("watch_items").select("*").order("id")); }
  catch (e) { if ((e as Error).message === "SETUP_SQL") watchReady = false; else throw e; }
  const settings = Object.fromEntries(settingRows.filter((r) => r.key !== "seeded").map((r) => [r.key, r.value]));
  const bucket = sb().storage.from("lampiran");
  const me: Me = { id: 0, username: "pengarah", role: "admin", memberId: null, unitId: null, name: who() };
  return {
    me, settings: settings as unknown as AppData["settings"], units, members, tasks,
    attachments: attachments.map((a) => ({ ...a, url: bucket.getPublicUrl(a.stored).data.publicUrl })),
    taskLog, followups, checklist, reports, users: [], watch, watchReady,
  } as unknown as AppData;
}

// ───────────── Penghantar (mengekalkan bentuk panggilan lama /api/...) ─────────────
export async function dispatch(method: string, url: string, body?: unknown): Promise<unknown> {
  let m: RegExpMatchArray | null;
  if (method === "GET" && url === "/api/data") return loadAll();
  if ((m = url.match(/^\/api\/r\/(\w+)(?:\/(\d+))?$/))) {
    const r = resources[m[1]]; if (!r) throw bad("Sumber tidak dijumpai.");
    if (method === "POST" && !m[2]) return r.create(body);
    if (method === "PATCH" && m[2]) return r.update(Number(m[2]), body);
    if (method === "DELETE" && m[2]) return r.remove(Number(m[2]));
  }
  if (method === "PATCH" && url === "/api/settings") {
    const d = SettingsSchema.parse(body);
    await q(sb().from("settings").upsert(Object.entries(d).map(([key, value]) => ({ key, value: String(value) })))); return ok;
  }
  if (method === "POST" && (m = url.match(/^\/api\/tasks\/(\d+)\/attachments$/))) return uploadAttachment(Number(m[1]), body as FormData);
  if (method === "DELETE" && (m = url.match(/^\/api\/attachments\/(\d+)$/))) return deleteAttachment(Number(m[1]));
  if (method === "GET" && (m = url.match(/^\/api\/reports\/(\d+)$/))) {
    const r = await one("reports", Number(m[1])); if (!r) throw bad("Laporan tidak ditemui."); return r;
  }
  throw bad("Tindakan tidak dikenali.");
}

export async function exportBackup() {
  const d = await loadAll();
  const { me, ...rest } = d; void me;
  return JSON.stringify({ app: "AJK Command Center 2026", exportedAt: now(), ...rest }, null, 2);
}
