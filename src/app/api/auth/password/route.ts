import { z } from "zod";
import bcrypt from "bcryptjs";
import { route, json, ApiError } from "@/lib/api";
import { db } from "@/lib/db";

export const POST = route(async (user, req) => {
  const { current, next } = z.object({ current: z.string().min(1, "Kata laluan semasa diperlukan"), next: z.string().min(8, "Kata laluan baharu minimum 8 aksara").max(100) }).parse(await json(req));
  const row = db().prepare("SELECT password_hash h FROM users WHERE id=?").get(user.id) as { h: string };
  if (!bcrypt.compareSync(current, row.h)) throw new ApiError(400, "Kata laluan semasa tidak betul.");
  db().prepare("UPDATE users SET password_hash=? WHERE id=?").run(bcrypt.hashSync(next, 10), user.id);
  return { ok: true };
});
