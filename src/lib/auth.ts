import "server-only";
import { cookies } from "next/headers";
import crypto from "crypto";
import { ROLES, roleCan, type Role, type Section } from "@/lib/roles";

const COOKIE = "admin_session";
const secret = process.env.SESSION_SECRET || "dev-insecure-secret";

// Cookie = "<roleKey>.<HMAC(secret, 'role:'+roleKey)>". Tanpa DB.
function sign(roleKey: string): string {
  return crypto.createHmac("sha256", secret).update("role:" + roleKey).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export function createSession(roleKey: string) {
  cookies().set(COOKIE, `${roleKey}.${sign(roleKey)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function destroySession() {
  cookies().delete(COOKIE);
}

/** Role dari cookie, atau null kalau belum login / cookie tidak valid. */
export function currentRole(): Role | null {
  const c = cookies().get(COOKIE)?.value;
  if (!c) return null;
  const dot = c.lastIndexOf(".");
  if (dot < 0) return null;
  const key = c.slice(0, dot);
  const sig = c.slice(dot + 1);
  const role = ROLES[key];
  if (!role) return null;
  return safeEqual(sig, sign(key)) ? role : null;
}

export function isAuthed(): boolean {
  return currentRole() !== null;
}

/** Apakah role yang sedang login boleh mengakses bagian ini. */
export function can(section: Section): boolean {
  return roleCan(currentRole(), section);
}

/** Lempar kalau role saat ini tidak berhak — dipakai di server action (mutasi data). */
export function requireSection(section: Section) {
  if (!can(section)) throw new Error("Unauthorized");
}
