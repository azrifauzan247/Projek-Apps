import { route, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
export const GET = route<{ params: Promise<{ id: string }> }>(async (_u, _r, ctx) => {
  const row = db().prepare("SELECT id,type,title,payload,created_by,created_at FROM reports WHERE id=?").get(Number((await ctx.params).id)) as { payload: string } | undefined;
  if (!row) throw new ApiError(404, "Laporan tidak ditemui.");
  return { ...row, payload: JSON.parse(row.payload) };
}, { roles: ["admin", "leader"] });
