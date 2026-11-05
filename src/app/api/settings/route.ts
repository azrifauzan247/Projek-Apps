import { z } from "zod";
import { route, json } from "@/lib/api";
import { db } from "@/lib/db";

const S = z.object({
  event_name: z.string().trim().min(1, "Nama program diperlukan").max(200),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarikh program tidak sah"),
  venue: z.string().trim().max(200), director: z.string().trim().max(200),
  stale_days: z.coerce.number().int().min(1).max(60), soon_days: z.coerce.number().int().min(1).max(30),
  wa_template: z.string().trim().min(10, "Templat mesej terlalu pendek").max(3000),
});
export const PATCH = route(async (_u, req) => {
  const d = S.parse(await json(req));
  const up = db().prepare("INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value");
  db().transaction(() => { for (const [k, v] of Object.entries(d)) up.run(k, String(v)); })();
  return { ok: true };
}, { roles: ["admin"] });
