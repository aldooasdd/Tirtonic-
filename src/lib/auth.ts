import "server-only";
import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE = "admin_session";
const secret = process.env.SESSION_SECRET || "dev-insecure-secret";

// Session token = HMAC(secret, "admin"). No DB needed for a single admin.
function token(): string {
  return crypto.createHmac("sha256", secret).update("admin").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export function checkPassword(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD || "";
  return pw.length > 0 && safeEqual(input, pw);
}

export function createSession() {
  cookies().set(COOKIE, token(), {
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

export function isAuthed(): boolean {
  const c = cookies().get(COOKIE)?.value;
  return Boolean(c && safeEqual(c, token()));
}
