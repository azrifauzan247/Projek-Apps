import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { currentUser, SessionUser, Role } from "./auth";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type Handler<C> = (user: SessionUser, req: Request, ctx: C) => Promise<unknown> | unknown;

export function route<C = unknown>(handler: Handler<C>, opts: { roles?: Role[]; public?: boolean } = {}) {
  return async (req: Request, ctx: C) => {
    try {
      const user = await currentUser();
      if (!user && !opts.public) throw new ApiError(401, "Sila log masuk semula.");
      if (user && opts.roles && !opts.roles.includes(user.role)) throw new ApiError(403, "Anda tiada kebenaran untuk tindakan ini.");
      const out = await handler(user as SessionUser, req, ctx);
      return out instanceof Response ? out : NextResponse.json(out ?? { ok: true });
    } catch (e) {
      if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) {
        const msg = e.issues.map((i) => `${i.path.join(".") || "data"}: ${i.message}`).join("; ");
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      const m = e instanceof Error ? e.message : String(e);
      if (/UNIQUE constraint/.test(m)) return NextResponse.json({ error: "Data dengan nilai ini sudah wujud." }, { status: 409 });
      console.error(e);
      return NextResponse.json({ error: "Ralat pelayan. Cuba lagi." }, { status: 500 });
    }
  };
}

export async function json<T = Record<string, unknown>>(req: Request): Promise<T> {
  try { return (await req.json()) as T; } catch { throw new ApiError(400, "Data tidak sah."); }
}
