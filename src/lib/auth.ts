import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db, getSetting } from "./db";

export type Role = "admin" | "leader" | "member";
export interface SessionUser {
  id: number;
  username: string;
  role: Role;
  memberId: number | null;
  unitId: number | null;
  name: string;
}

const COOKIE = "ajk_session";
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET || getSetting("auth_secret"));

export async function createSession(userId: number) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("14d")
    .sign(key());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 14 * 86400,
    secure: process.env.COOKIE_SECURE === "true",
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    const row = db()
      .prepare(
        `SELECT u.id, u.username, u.role, u.member_id memberId, m.unit_id unitId, COALESCE(m.name, u.username) name
         FROM users u LEFT JOIN members m ON m.id = u.member_id WHERE u.id = ?`
      )
      .get(Number(payload.uid)) as SessionUser | undefined;
    return row ?? null;
  } catch {
    return null;
  }
}
