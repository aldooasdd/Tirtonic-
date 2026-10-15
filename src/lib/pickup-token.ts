import "server-only";
import crypto from "crypto";

// Token QR ambil produk = "<claimId>.<HMAC(secret,'pickup:'+id)>". Dicegah dipalsukan.
const secret = process.env.SESSION_SECRET || "dev-insecure-secret";

function sign(id: string): string {
  return crypto.createHmac("sha256", secret).update("pickup:" + id).digest("hex");
}

export function pickupToken(claimId: string): string {
  return `${claimId}.${sign(claimId)}`;
}

/** claimId dari token, atau null kalau tidak valid. */
export function verifyPickupToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const id = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expect = sign(id);
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? id : null;
}
