import "server-only";
import crypto from "node:crypto";

// Perbandingan constant-time terhadap env. Password tidak pernah dikirim balik / disimpan di klien.
export function checkPassword(input: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
