import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { route, ApiError } from "@/lib/api";
import { db, UPLOAD_DIR } from "@/lib/db";

const MAX = 10 * 1024 * 1024;
export const POST = route<{ params: Promise<{ id: string }> }>(async (user, req, ctx) => {
  const taskId = Number((await ctx.params).id);
  const t = db().prepare("SELECT unit_id, member_id FROM tasks WHERE id=?").get(taskId) as { unit_id: number | null; member_id: number | null } | undefined;
  if (!t) throw new ApiError(404, "Tugasan tidak ditemui.");
  if (user.role === "leader" && t.unit_id !== user.unitId) throw new ApiError(403, "Tiada kebenaran.");
  if (user.role === "member" && t.member_id !== user.memberId) throw new ApiError(403, "Tiada kebenaran.");
  const file = (await req.formData()).get("file");
  if (!(file instanceof File) || file.size === 0) throw new ApiError(400, "Pilih fail untuk dimuat naik.");
  if (file.size > MAX) throw new ApiError(413, "Fail melebihi had 10MB.");
  const ext = path.extname(file.name).slice(0, 10).replace(/[^.\w]/g, "");
  const stored = crypto.randomUUID() + ext;
  fs.writeFileSync(path.join(UPLOAD_DIR, stored), Buffer.from(await file.arrayBuffer()));
  db().prepare("INSERT INTO attachments(task_id,name,stored,size,mime) VALUES (?,?,?,?,?)").run(taskId, file.name.slice(0, 200), stored, file.size, file.type || "application/octet-stream");
  db().prepare("UPDATE tasks SET updated_at=? WHERE id=?").run(new Date().toISOString(), taskId);
  return { ok: true };
});
