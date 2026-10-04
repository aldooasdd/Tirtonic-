import "server-only";
import { cookies } from "next/headers";
import crypto from "crypto";

// Gerbang login untuk perangkat stringer di /stringer. Terpisah dari admin dashboard.
// Password: STRINGER_PASSWORD, fallback ke ADMIN_PASSWORD biar langsung jalan tanpa env baru.
const COOKIE = "stringer_session";
const secret = process.env.SESSION_SECRET || "dev-insecure-secret";

function token(): string {
  return crypto.createHmac("sha256", secret).update("stringer").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export function checkStringerPassword(input: string): boolean {
  const pw = process.env.STRINGER_PASSWORD || process.env.ADMIN_PASSWORD || "";
  return pw.length > 0 && safeEqual(input, pw);
}

export function createStringerSession() {
  cookies().set(COOKIE, token(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 hari (perangkat toko)
  });
}

export function destroyStringerSession() {
  cookies().delete(COOKIE);
}

export function isStringer(): boolean {
  const c = cookies().get(COOKIE)?.value;
  return Boolean(c && safeEqual(c, token()));
}
