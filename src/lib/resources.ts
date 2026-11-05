import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { ApiError } from "./api";
import type { SessionUser } from "./auth";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tarikh tidak sah").nullable().optional().or(z.literal("").transform(() => null));
const str = (max = 2000) => z.string().trim().max(max);
const req = (label: string, max = 200) => z.string().trim().min(1, `${label} diperlukan`).max(max);
const id = z.coerce.number().int().positive();
const nid = z.preprocess((v) => (v === "" || v === undefined ? null : v), z.coerce.number().int().positive().nullable());
const phone = z.string().trim().regex(/^(\+?[0-9][0-9 \-]{7,17})?$/, "No. telefon tidak sah").default("");

export const UnitSchema = z.object({ name: req("Nama unit"), description: str(500).default("") });
export const MemberSchema = z.object({
  name: req("Nama"), unit_id: nid, position: req("Jawatan", 80).default("Ahli"),
  phone, extra_resp: str(1000).default(""), active: z.coerce.number().int().min(0).max(1).default(1),
});
export const TaskSchema = z.object({
  title: req("Tajuk tugasan", 200), description: str().default(""), unit_id: nid, member_id: nid,
  priority: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
  start_date: date, deadline: date,
  status: z.enum(["pending", "ongoing", "done"]).default("pending"),
  progress: z.coerce.number().int().min(0).max(100).default(0), notes: str(4000).default(""),
}).refine((t) => !t.start_date || !t.deadline || t.deadline >= t.start_date, { message: "Tarikh akhir mesti selepas tarikh mula", path: ["deadline"] });
export const FollowupSchema = z.object({
  member_id: id, task_id: nid, contacted_at: req("Tarikh & masa", 40),
  method: z.enum(["WhatsApp", "Panggilan", "Bersemuka", "Mesyuarat", "Lain-lain"]).default("WhatsApp"),
  summary: str().default(""), responded: z.coerce.number().int().min(0).max(1).default(0),
  response: str().default(""), action_required: str().default(""), next_followup: date,
});
export const ChecklistSchema = z.object({ category: req("Kategori", 100), title: req("Tajuk", 200) });
export const UserSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,30}$/, "Nama pengguna 3-30 aksara (a-z, 0-9, . _ -)"),
  password: z.string().min(8, "Kata laluan minimum 8 aksara").max(100),
  role: z.enum(["admin", "leader", "member"]), member_id: nid,
});

const now = () => new Date().toISOString();
const noPerm = () => new ApiError(403, "Anda tiada kebenaran untuk tindakan ini.");
const notFound = () => new ApiError(404, "Rekod tidak ditemui.");
const one = <T,>(sql: string, ...p: unknown[]) => db().prepare(sql).get(...p) as T | undefined;

// ---- Tugasan: peraturan konsisten status/progress ----
function normalize(t: z.infer<typeof TaskSchema>, prev?: { status: string; progress: number }) {
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

function logTask(taskId: number, status: string, progress: number, user: SessionUser) {
  db().prepare("INSERT INTO task_log(task_id,at,status,progress,by_user) VALUES (?,?,?,?,?)").run(taskId, now(), status, progress, user.name);
}

type TaskRow = { id: number; unit_id: number | null; member_id: number | null; status: string; progress: number; completed_at: string | null };

function checkMember(unit_id: number | null, member_id: number | null) {
  if (member_id == null) return;
  const m = one<{ unit_id: number | null }>("SELECT unit_id FROM members WHERE id=?", member_id);
  if (!m) throw new ApiError(400, "Ahli yang dipilih tidak wujud.");
  if (unit_id != null && m.unit_id !== unit_id) throw new ApiError(400, "Ahli yang dipilih bukan dalam unit tugasan ini.");
}

export const resources = {
  units: {
    create(u: SessionUser, body: unknown) {
      if (u.role !== "admin") throw noPerm();
      const d = UnitSchema.parse(body);
      const sort = (one<{ m: number }>("SELECT COALESCE(MAX(sort),0)+1 m FROM units")!).m;
      return { id: Number(db().prepare("INSERT INTO units(name,description,sort) VALUES (?,?,?)").run(d.name, d.description, sort).lastInsertRowid) };
    },
    update(u: SessionUser, rid: number, body: unknown) {
      if (u.role !== "admin") throw noPerm();
      const d = UnitSchema.parse(body);
      if (!db().prepare("UPDATE units SET name=?, description=? WHERE id=?").run(d.name, d.description, rid).changes) throw notFound();
      return { ok: true };
    },
    remove(u: SessionUser, rid: number) {
      if (u.role !== "admin") throw noPerm();
      const n = one<{ c: number }>("SELECT (SELECT COUNT(*) FROM members WHERE unit_id=?)+(SELECT COUNT(*) FROM tasks WHERE unit_id=?) c", rid, rid)!.c;
      if (n > 0) throw new ApiError(409, "Unit masih mempunyai ahli atau tugasan. Pindahkan atau padam dahulu.");
      db().prepare("DELETE FROM units WHERE id=?").run(rid);
      return { ok: true };
    },
  },
  members: {
    create(u: SessionUser, body: unknown) {
      if (u.role !== "admin") throw noPerm();
      const d = MemberSchema.parse(body);
      const sort = (one<{ m: number }>("SELECT COALESCE(MAX(sort),0)+1 m FROM members")!).m;
      return { id: Number(db().prepare("INSERT INTO members(name,unit_id,position,phone,extra_resp,active,sort) VALUES (?,?,?,?,?,?,?)").run(d.name, d.unit_id, d.position, d.phone, d.extra_resp, d.active, sort).lastInsertRowid) };
    },
    update(u: SessionUser, rid: number, body: unknown) {
      if (u.role !== "admin") throw noPerm();
      const d = MemberSchema.parse(body);
      const old = one<{ unit_id: number | null }>("SELECT unit_id FROM members WHERE id=?", rid);
      if (!old) throw notFound();
      db().transaction(() => {
        db().prepare("UPDATE members SET name=?, unit_id=?, position=?, phone=?, extra_resp=?, active=? WHERE id=?").run(d.name, d.unit_id, d.position, d.phone, d.extra_resp, d.active, rid);
        // pindah unit => tugasan belum selesai yang masih milik ahli dipindahkan bersama
        if (old.unit_id !== d.unit_id) db().prepare("UPDATE tasks SET unit_id=?, updated_at=? WHERE member_id=? AND status!='done'").run(d.unit_id, now(), rid);
      })();
      return { ok: true };
    },
    remove(u: SessionUser, rid: number) {
      if (u.role !== "admin") throw noPerm();
      if (one<{ member_id: number }>("SELECT member_id FROM users WHERE member_id=? AND role='admin'", rid)) throw new ApiError(409, "Ahli ini mempunyai akaun admin. Tukar peranan dahulu.");
      db().prepare("DELETE FROM members WHERE id=?").run(rid); // tugasan menjadi tidak ditugaskan (SET NULL)
      return { ok: true };
    },
  },
  tasks: {
    create(u: SessionUser, body: unknown) {
      if (u.role === "member") throw noPerm();
      let d = TaskSchema.parse(body);
      if (u.role === "leader") d = { ...d, unit_id: u.unitId };
      checkMember(d.unit_id, d.member_id);
      const n = normalize(d);
      const t = now();
      return db().transaction(() => {
        const rid = Number(db().prepare("INSERT INTO tasks(title,description,unit_id,member_id,priority,start_date,deadline,status,progress,notes,completed_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
          .run(n.title, n.description, n.unit_id, n.member_id, n.priority, n.start_date ?? null, n.deadline ?? null, n.status, n.progress, n.notes, n.status === "done" ? t : null, t, t).lastInsertRowid);
        logTask(rid, n.status, n.progress, u);
        return { id: rid };
      })();
    },
    update(u: SessionUser, rid: number, body: unknown) {
      const old = one<TaskRow>("SELECT * FROM tasks WHERE id=?", rid);
      if (!old) throw notFound();
      let d: z.infer<typeof TaskSchema>;
      if (u.role === "member") {
        if (old.member_id !== u.memberId) throw noPerm();
        const cur = one<Record<string, unknown>>("SELECT * FROM tasks WHERE id=?", rid)!;
        const p = z.object({ status: z.enum(["pending", "ongoing", "done"]), progress: z.coerce.number().int().min(0).max(100), notes: str(4000).default("") }).parse(body);
        d = TaskSchema.parse({ ...cur, ...p });
      } else {
        if (u.role === "leader" && old.unit_id !== u.unitId) throw noPerm();
        d = TaskSchema.parse(body);
        if (u.role === "leader") d = { ...d, unit_id: u.unitId };
      }
      checkMember(d.unit_id, d.member_id);
      const n = normalize(d, old);
      const t = now();
      db().transaction(() => {
        db().prepare("UPDATE tasks SET title=?,description=?,unit_id=?,member_id=?,priority=?,start_date=?,deadline=?,status=?,progress=?,notes=?,is_draft=0,completed_at=?,updated_at=? WHERE id=?")
          .run(n.title, n.description, n.unit_id, n.member_id, n.priority, n.start_date ?? null, n.deadline ?? null, n.status, n.progress, n.notes,
            n.status === "done" ? old.completed_at ?? t : null, t, rid);
        if (n.status !== old.status || n.progress !== old.progress) logTask(rid, n.status, n.progress, u);
      })();
      return { ok: true };
    },
    remove(u: SessionUser, rid: number) {
      if (u.role === "member") throw noPerm();
      const old = one<TaskRow>("SELECT * FROM tasks WHERE id=?", rid);
      if (!old) throw notFound();
      if (u.role === "leader" && old.unit_id !== u.unitId) throw noPerm();
      db().prepare("DELETE FROM tasks WHERE id=?").run(rid);
      return { ok: true };
    },
  },
  followups: {
    create(u: SessionUser, body: unknown) {
      if (u.role === "member") throw noPerm();
      const d = FollowupSchema.parse(body);
      const m = one<{ unit_id: number | null }>("SELECT unit_id FROM members WHERE id=?", d.member_id);
      if (!m) throw new ApiError(400, "Ahli tidak wujud.");
      if (u.role === "leader" && m.unit_id !== u.unitId) throw noPerm();
      return { id: Number(db().prepare("INSERT INTO followups(member_id,task_id,contacted_at,method,summary,responded,response,action_required,next_followup,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)")
        .run(d.member_id, d.task_id, d.contacted_at, d.method, d.summary, d.responded, d.response, d.action_required, d.next_followup ?? null, u.name).lastInsertRowid) };
    },
    update(u: SessionUser, rid: number, body: unknown) {
      if (u.role === "member") throw noPerm();
      const d = FollowupSchema.parse(body);
      const old = one<{ unit_id: number | null }>("SELECT m.unit_id FROM followups f JOIN members m ON m.id=f.member_id WHERE f.id=?", rid);
      if (!old) throw notFound();
      if (u.role === "leader" && old.unit_id !== u.unitId) throw noPerm();
      db().prepare("UPDATE followups SET member_id=?,task_id=?,contacted_at=?,method=?,summary=?,responded=?,response=?,action_required=?,next_followup=? WHERE id=?")
        .run(d.member_id, d.task_id, d.contacted_at, d.method, d.summary, d.responded, d.response, d.action_required, d.next_followup ?? null, rid);
      return { ok: true };
    },
    remove(u: SessionUser, rid: number) {
      if (u.role !== "admin") throw noPerm();
      db().prepare("DELETE FROM followups WHERE id=?").run(rid);
      return { ok: true };
    },
  },
  checklist: {
    create(u: SessionUser, body: unknown) {
      if (u.role !== "admin") throw noPerm();
      const d = ChecklistSchema.parse(body);
      const sort = (one<{ m: number }>("SELECT COALESCE(MAX(sort),0)+1 m FROM checklist")!).m;
      return { id: Number(db().prepare("INSERT INTO checklist(category,title,sort) VALUES (?,?,?)").run(d.category, d.title, sort).lastInsertRowid) };
    },
    update(u: SessionUser, rid: number, body: unknown) {
      if (u.role === "member") throw noPerm();
      const b = body as { done?: unknown };
      if (typeof b.done === "boolean") {
        const r = db().prepare("UPDATE checklist SET done=?, done_at=?, done_by=? WHERE id=?").run(b.done ? 1 : 0, b.done ? now() : null, b.done ? u.name : "", rid);
        if (!r.changes) throw notFound();
        return { ok: true };
      }
      if (u.role !== "admin") throw noPerm();
      const d = ChecklistSchema.parse(body);
      if (!db().prepare("UPDATE checklist SET category=?, title=? WHERE id=?").run(d.category, d.title, rid).changes) throw notFound();
      return { ok: true };
    },
    remove(u: SessionUser, rid: number) {
      if (u.role !== "admin") throw noPerm();
      db().prepare("DELETE FROM checklist WHERE id=?").run(rid);
      return { ok: true };
    },
  },
  users: {
    create(u: SessionUser, body: unknown) {
      if (u.role !== "admin") throw noPerm();
      const d = UserSchema.parse(body);
      if (d.role !== "admin" && !d.member_id) throw new ApiError(400, "Pilih ahli yang dipautkan kepada akaun ini.");
      if (d.role === "leader" && !one<{ unit_id: number }>("SELECT unit_id FROM members WHERE id=? AND unit_id IS NOT NULL", d.member_id)) throw new ApiError(400, "Ahli mesti berada dalam satu unit untuk menjadi ketua unit.");
      return { id: Number(db().prepare("INSERT INTO users(username,password_hash,role,member_id) VALUES (?,?,?,?)").run(d.username, bcrypt.hashSync(d.password, 10), d.role, d.member_id).lastInsertRowid) };
    },
    update(u: SessionUser, rid: number, body: unknown) {
      if (u.role !== "admin") throw noPerm();
      const b = z.object({ password: z.string().min(8, "Kata laluan minimum 8 aksara").max(100).optional(), role: z.enum(["admin", "leader", "member"]).optional() }).parse(body);
      const cur = one<{ role: string }>("SELECT role FROM users WHERE id=?", rid);
      if (!cur) throw notFound();
      if (b.role && b.role !== "admin" && cur.role === "admin" && one<{ c: number }>("SELECT COUNT(*) c FROM users WHERE role='admin'")!.c <= 1) throw new ApiError(409, "Mesti ada sekurang-kurangnya seorang admin.");
      if (b.password) db().prepare("UPDATE users SET password_hash=? WHERE id=?").run(bcrypt.hashSync(b.password, 10), rid);
      if (b.role) db().prepare("UPDATE users SET role=? WHERE id=?").run(b.role, rid);
      return { ok: true };
    },
    remove(u: SessionUser, rid: number) {
      if (u.role !== "admin") throw noPerm();
      if (rid === u.id) throw new ApiError(409, "Anda tidak boleh memadam akaun sendiri.");
      const cur = one<{ role: string }>("SELECT role FROM users WHERE id=?", rid);
      if (cur?.role === "admin" && one<{ c: number }>("SELECT COUNT(*) c FROM users WHERE role='admin'")!.c <= 1) throw new ApiError(409, "Mesti ada sekurang-kurangnya seorang admin.");
      db().prepare("DELETE FROM users WHERE id=?").run(rid);
      return { ok: true };
    },
  },
  reports: {
    create(u: SessionUser, body: unknown) {
      const d = z.object({ type: req("Jenis", 40), title: req("Tajuk", 200), payload: z.unknown() }).parse(body);
      const payload = JSON.stringify(d.payload);
      if (payload.length > 3_000_000) throw new ApiError(413, "Laporan terlalu besar.");
      return { id: Number(db().prepare("INSERT INTO reports(type,title,payload,created_by,created_at) VALUES (?,?,?,?,?)").run(d.type, d.title, payload, u.name, now()).lastInsertRowid) };
    },
    update() { throw new ApiError(405, "Tidak dibenarkan."); },
    remove(u: SessionUser, rid: number) {
      if (u.role !== "admin") throw noPerm();
      db().prepare("DELETE FROM reports WHERE id=?").run(rid);
      return { ok: true };
    },
  },
} as const;

export type ResourceName = keyof typeof resources;
