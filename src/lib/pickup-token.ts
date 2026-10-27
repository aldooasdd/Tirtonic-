import "server-only";
import crypto from "crypto";

// Token QR = "<claimId>.<HMAC(secret,'<kind>:'+id)>". Dicegah dipalsukan.
// kind "pickup" = ambil produk, "return" = pengembalian ke toko.
const secret = process.env.SESSION_SECRET || "dev-insecure-secret";

function sign(kind: string, id: string): string {
  return crypto.createHmac("sha256", secret).update(kind + ":" + id).digest("hex");
}

function make(kind: string, claimId: string): string {
  return `${claimId}.${sign(kind, claimId)}`;
}

/** claimId dari token, atau null kalau tidak valid. */
function verify(kind: string, token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const id = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(kind, id));
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? id : null;
}

export const pickupToken = (claimId: string) => make("pickup", claimId);
export const verifyPickupToken = (token: string) => verify("pickup", token);
export const returnToken = (claimId: string) => make("return", claimId);
export const verifyReturnToken = (token: string) => verify("return", token);
export const rewardToken = (rewardId: string) => make("reward", rewardId);
export const verifyRewardToken = (token: string) => verify("reward", token);
