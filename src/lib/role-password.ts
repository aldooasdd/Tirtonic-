import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { ROLES, rolePassword } from "@/lib/roles";

// Hash kata sandi: "<salt>:<scrypt>". Scrypt dari node crypto, tanpa dependency.
export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const h = crypto.scryptSync(pw, salt, 32).toString("hex");
  return `${salt}:${h}`;
}

export function verifyHash(pw: string, stored: string): boolean {
  const [salt, h] = stored.split(":");
  if (!salt || !h) return false;
  const calc = crypto.scryptSync(pw, salt, 32).toString("hex");
  const a = Buffer.from(h);
  const b = Buffer.from(calc);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

// Semua override dari DB sekali ambil → Map<role, hash>.
async function overrides(): Promise<Map<string, string>> {
  const rows = await prisma.rolePassword.findMany();
  return new Map(rows.map((r) => [r.role, r.hash]));
}

/** Cocokkan input dengan password efektif suatu role: override DB kalau ada,
 *  kalau tidak pakai default dari src/lib/roles.ts (config/env). */
export async function roleMatches(key: string, input: string, ovs?: Map<string, string>): Promise<boolean> {
  if (!input) return false;
  const map = ovs ?? (await overrides());
  const ov = map.get(key);
  if (ov) return verifyHash(input, ov);
  const def = rolePassword(key);
  return def.length > 0 && safeEqual(input, def);
}

/** Cari role yang password efektifnya cocok dengan input (dipakai saat login). */
export async function findRoleByPassword(input: string): Promise<string | null> {
  if (!input) return null;
  const map = await overrides();
  for (const key of Object.keys(ROLES)) {
    if (await roleMatches(key, input, map)) return key;
  }
  return null;
}

export async function setRolePassword(key: string, pw: string): Promise<void> {
  const hash = hashPassword(pw);
  await prisma.rolePassword.upsert({ where: { role: key }, update: { hash }, create: { role: key, hash } });
}

// ponytail: self-check hash/verify. Jalankan: npx tsx src/lib/role-password.ts
if (require.main === module) {
  const h = hashPassword("rahasia123");
  if (!verifyHash("rahasia123", h)) throw new Error("FAIL verify benar");
  if (verifyHash("salah", h)) throw new Error("FAIL tolak salah");
  if (verifyHash("rahasia123", "badformat")) throw new Error("FAIL format rusak");
  console.log("role-password self-check OK");
}
