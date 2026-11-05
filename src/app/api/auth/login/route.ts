import { z } from "zod";
import bcrypt from "bcryptjs";
import { route, json, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";

// had percubaan mudah (dalam memori) untuk menyukarkan serangan teka kata laluan
const attempts = new Map<string, { n: number; t: number }>();

export const POST = route(async (_u, req) => {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const a = attempts.get(ip);
  if (a && Date.now() - a.t < 15 * 60_000 && a.n >= 10) throw new ApiError(429, "Terlalu banyak percubaan. Cuba lagi selepas 15 minit.");
  const { username, password } = z.object({ username: z.string().trim().toLowerCase().min(1, "Nama pengguna diperlukan"), password: z.string().min(1, "Kata laluan diperlukan") }).parse(await json(req));
  const row = db().prepare("SELECT id, password_hash FROM users WHERE username=?").get(username) as { id: number; password_hash: string } | undefined;
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    attempts.set(ip, { n: (a && Date.now() - a.t < 15 * 60_000 ? a.n : 0) + 1, t: Date.now() });
    throw new ApiError(401, "Nama pengguna atau kata laluan tidak betul.");
  }
  attempts.delete(ip);
  await createSession(row.id);
  return { ok: true };
}, { public: true });
