import { route } from "@/lib/api";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const GET = route(async (u) => {
  const q = (sql: string, ...p: unknown[]) => db().prepare(sql).all(...p) as Record<string, unknown>[];
  const settings = Object.fromEntries(q("SELECT key,value FROM settings WHERE key!='auth_secret'").map((r) => [r.key, r.value]));
  const scoped = u.role !== "admin";
  const unit = u.unitId ?? -1;

  const units = scoped ? q("SELECT * FROM units WHERE id=? ORDER BY sort", unit) : q("SELECT * FROM units ORDER BY sort");
  const members = scoped
    ? q("SELECT * FROM members WHERE unit_id=? ORDER BY sort", unit)
    : q("SELECT * FROM members ORDER BY sort");
  const tasks =
    u.role === "admin" ? q("SELECT * FROM tasks ORDER BY id")
    : u.role === "leader" ? q("SELECT * FROM tasks WHERE unit_id=? ORDER BY id", unit)
    : q("SELECT * FROM tasks WHERE member_id=? ORDER BY id", u.memberId ?? -1);
  const ids = tasks.map((t) => t.id as number);
  const inList = ids.length ? `(${ids.join(",")})` : "(-1)";
  const attachments = q(`SELECT id,task_id,name,size,mime,created_at FROM attachments WHERE task_id IN ${inList} ORDER BY id`);
  const taskLog = u.role === "member" ? [] : q(`SELECT task_id,at,status,progress,by_user FROM task_log WHERE task_id IN ${inList} AND at >= ? ORDER BY at`, new Date(Date.now() - 60 * 86400_000).toISOString());
  const followups = u.role === "member" ? [] : scoped
    ? q("SELECT f.* FROM followups f JOIN members m ON m.id=f.member_id WHERE m.unit_id=? ORDER BY f.contacted_at DESC, f.id DESC", unit)
    : q("SELECT * FROM followups ORDER BY contacted_at DESC, id DESC");
  const checklist = q("SELECT * FROM checklist ORDER BY sort");
  const reports = u.role === "member" ? [] : q("SELECT id,type,title,created_by,created_at FROM reports ORDER BY id DESC LIMIT 100");
  const users = u.role === "admin" ? q("SELECT id,username,role,member_id,created_at FROM users ORDER BY id") : [];
  if (u.role === "member") delete settings.wa_template;
  return { me: u, settings, units, members, tasks, attachments, taskLog, followups, checklist, reports, users };
});
