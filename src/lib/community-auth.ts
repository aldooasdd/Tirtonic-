import "server-only";
import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// Sesi login komunitas. Cookie = "<communityId>.<HMAC(secret,'community:'+id)>". Tanpa tabel sesi.
const COOKIE = "community_session";
const secret = process.env.SESSION_SECRET || "dev-insecure-secret";

function sign(id: string): string {
  return crypto.createHmac("sha256", secret).update("community:" + id).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export function createCommunitySession(id: string) {
  cookies().set(COOKIE, `${id}.${sign(id)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 hari
  });
}

export function destroyCommunitySession() {
  cookies().delete(COOKIE);
}

/** communityId dari cookie, atau null kalau belum login / cookie tidak valid. */
export function currentCommunityId(): string | null {
  const c = cookies().get(COOKIE)?.value;
  if (!c) return null;
  const dot = c.lastIndexOf(".");
  if (dot < 0) return null;
  const id = c.slice(0, dot);
  const sig = c.slice(dot + 1);
  return safeEqual(sig, sign(id)) ? id : null;
}

/** Komunitas yang sedang login (dari DB), atau null. */
export async function currentCommunity() {
  const id = currentCommunityId();
  if (!id) return null;
  return prisma.community.findUnique({ where: { id } });
}
