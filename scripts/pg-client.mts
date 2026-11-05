// Penyesuai ujian: meniru bahagian supabase-js yang digunakan app, di atas Postgres sebenar.
import pg from "pg";
pg.types.setTypeParser(20, Number); // bigint => nombor, seperti PostgREST

type Res = { data: any; error: { message: string; code?: string } | null }; // eslint-disable-line @typescript-eslint/no-explicit-any
class QB implements PromiseLike<Res> {
  private op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private cols = "*"; private rows: any[] = []; private vals: any = {}; private where: string[] = []; private args: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  private ord: string[] = []; private lim?: number; private ret = false;
  constructor(private pool: pg.Pool, private t: string) {}
  select(c = "*") { if (this.op === "select") this.cols = c; else { this.ret = true; this.cols = c; } return this; }
  insert(r: any) { this.op = "insert"; this.rows = Array.isArray(r) ? r : [r]; return this; } // eslint-disable-line @typescript-eslint/no-explicit-any
  upsert(r: any) { this.op = "upsert"; this.rows = Array.isArray(r) ? r : [r]; return this; } // eslint-disable-line @typescript-eslint/no-explicit-any
  update(v: any) { this.op = "update"; this.vals = v; return this; } // eslint-disable-line @typescript-eslint/no-explicit-any
  delete() { this.op = "delete"; return this; }
  private w(col: string, op: string, v: any) { this.args.push(v); this.where.push(`"${col}" ${op} $${this.args.length}`); return this; } // eslint-disable-line @typescript-eslint/no-explicit-any
  eq(c: string, v: any) { return this.w(c, "=", v); } neq(c: string, v: any) { return this.w(c, "<>", v); } gte(c: string, v: any) { return this.w(c, ">=", v); } // eslint-disable-line @typescript-eslint/no-explicit-any
  order(c: string, o: { ascending?: boolean } = {}) { this.ord.push(`"${c}" ${o.ascending === false ? "DESC" : "ASC"}`); return this; }
  limit(n: number) { this.lim = n; return this; }
  then<A = Res, B = never>(ok?: ((v: Res) => A | PromiseLike<A>) | null, no?: ((r: unknown) => B | PromiseLike<B>) | null) { return this.run().then(ok, no); }
  private async run(): Promise<Res> {
    try {
      const W = this.where.length ? ` WHERE ${this.where.join(" AND ")}` : "";
      const ret = this.ret ? ` RETURNING ${this.cols}` : "";
      let sql = ""; const a = [...this.args];
      if (this.op === "select") sql = `SELECT ${this.cols} FROM "${this.t}"${W}${this.ord.length ? " ORDER BY " + this.ord.join(",") : ""}${this.lim ? " LIMIT " + this.lim : ""}`;
      else if (this.op === "delete") sql = `DELETE FROM "${this.t}"${W}`;
      else if (this.op === "update") { const ks = Object.keys(this.vals); const base = a.length; ks.forEach((k) => a.push(norm(this.vals[k]))); sql = `UPDATE "${this.t}" SET ${ks.map((k, i) => `"${k}"=$${base + i + 1}`).join(",")}${W}${ret}`; }
      else {
        const ks = [...new Set(this.rows.flatMap((r) => Object.keys(r)))]; const ph: string[] = [];
        for (const r of this.rows) ph.push("(" + ks.map((k) => { a.push(norm(r[k] ?? null)); return `$${a.length}`; }).join(",") + ")");
        sql = `INSERT INTO "${this.t}"(${ks.map((k) => `"${k}"`).join(",")}) VALUES ${ph.join(",")}` + (this.op === "upsert" ? ` ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value` : "") + ret;
      }
      const r = await this.pool.query(sql, a);
      return { data: this.op === "select" || this.ret ? r.rows : null, error: null };
    } catch (e) { return { data: null, error: { message: (e as Error).message, code: (e as { code?: string }).code } }; }
  }
}
const norm = (v: any) => (v !== null && typeof v === "object" && !(v instanceof Date) ? JSON.stringify(v) : v); // eslint-disable-line @typescript-eslint/no-explicit-any

export function makePgClient(pool: pg.Pool) {
  const files = new Map<string, Buffer>();
  return {
    from: (t: string) => new QB(pool, t),
    storage: { from: () => ({
      upload: async (p: string, f: File) => { files.set(p, Buffer.from(await f.arrayBuffer())); return { data: {}, error: null }; },
      remove: async (ps: string[]) => { ps.forEach((p) => files.delete(p)); return { data: [], error: null }; },
      getPublicUrl: (p: string) => ({ data: { publicUrl: `http://storage.test/lampiran/${p}` } }),
    }) },
    _files: files,
  };
}
