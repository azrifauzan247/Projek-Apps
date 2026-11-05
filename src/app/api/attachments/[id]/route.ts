import fs from "node:fs";
import path from "node:path";
import { route, ApiError } from "@/lib/api";
import { db, UPLOAD_DIR } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";

type Row = { id: number; name: string; stored: string; mime: string; unit_id: number | null; member_id: number | null };
function load(user: SessionUser, id: number): Row {
  const r = db().prepare("SELECT a.*, t.unit_id, t.member_id FROM attachments a JOIN tasks t ON t.id=a.task_id WHERE a.id=?").get(id) as Row | undefined;
  if (!r) throw new ApiError(404, "Lampiran tidak ditemui.");
  if (user.role === "leader" && r.unit_id !== user.unitId) throw new ApiError(403, "Tiada kebenaran.");
  if (user.role === "member" && r.member_id !== user.memberId) throw new ApiError(403, "Tiada kebenaran.");
  return r;
}
type Ctx = { params: Promise<{ id: string }> };
export const GET = route<Ctx>(async (user, _r, ctx) => {
  const r = load(user, Number((await ctx.params).id));
  const file = path.join(UPLOAD_DIR, path.basename(r.stored));
  if (!fs.existsSync(file)) throw new ApiError(404, "Fail tiada pada pelayan.");
  return new Response(fs.readFileSync(file), { headers: { "Content-Type": r.mime, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(r.name)}`, "X-Content-Type-Options": "nosniff" } });
});
export const DELETE = route<Ctx>(async (user, _r, ctx) => {
  const r = load(user, Number((await ctx.params).id));
  db().prepare("DELETE FROM attachments WHERE id=?").run(r.id);
  fs.rmSync(path.join(UPLOAD_DIR, path.basename(r.stored)), { force: true });
  return { ok: true };
});
