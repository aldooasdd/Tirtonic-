import "server-only";
import { prisma } from "@/lib/prisma";

// Ace Points pelanggan: tier + saldo dihitung di API Tirtonichub (DB terpisah).
// Flag keanggotaan (coach/Privé) ada di DB app toko (tabel Member) → dikirim ke hub.
// Referral coach (2% belanja murid) dihitung di sini: Σ belanja murid / 50.000 Ace.
// 1 Ace = Rp1.000. Mulai 1 Nov 2026 WIB.
// Env: TIRTONICHUB_POINTS_URL + POINTS_API_SECRET. Hub mati → default White saldo 0.

const ACE_VALUE = 1000;
const RP_PER_REFERRAL_ACE = 50_000; // coach 2% × (Rp1.000/Ace) = belanja/50.000

export type AcePoints = {
  tier: string;
  tierLabel: string;
  balance: number;
  rp: number;
  referral: number; // Ace dari referral murid (coach)
  nextTier: string | null;
  nextTierLabel: string | null;
  pct: number;
  spendToNext: number;
  nextBenefit: string | null;
};

const BENEFIT: Record<string, string> = {
  White: "Poin belanja 1%",
  Signature: "Poin 1,5% + antrean prioritas",
  Prive: "Poin 2,5% + benefit eksklusif",
  Green: "Poin 2% + kode referral",
};

const DEFAULT: AcePoints = {
  tier: "White",
  tierLabel: "Tirtonic White",
  balance: 0,
  rp: 0,
  referral: 0,
  nextTier: "Signature",
  nextTierLabel: "Tirtonic Signature",
  pct: 0,
  spendToNext: 15_000_000,
  nextBenefit: BENEFIT.Signature,
};

const num = (v: unknown, d = 0) => (typeof v === "number" && isFinite(v) ? v : d);

// Ambil payload hub untuk 1 nomor (dengan flag opsional). null kalau gagal.
async function hubGet(base: string, secret: string, phone: string, flags?: { coach?: boolean; prive?: boolean }) {
  try {
    const u = new URL(base);
    u.searchParams.set("phone", phone);
    if (flags?.coach) u.searchParams.set("coach", "1");
    if (flags?.prive) u.searchParams.set("prive", "1");
    const res = await fetch(u, { headers: { "x-points-secret": secret }, cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function fetchAcePoints(phone: string | null): Promise<AcePoints> {
  const base = process.env.TIRTONICHUB_POINTS_URL;
  const secret = process.env.POINTS_API_SECRET;
  if (!base || !secret || !phone) return DEFAULT;

  const member = await prisma.member.findUnique({ where: { phone } }).catch(() => null);
  const j = await hubGet(base, secret, phone, { coach: member?.isCoach, prive: member?.invitedPrive });
  if (!j) return DEFAULT;

  // Referral: coach dapat 2% belanja tiap murid (referredBy = coachCode-nya).
  // ponytail: 1 request hub per murid (sedikit). Kalau murid banyak, bikin endpoint agregat di hub.
  let referral = 0;
  if (member?.isCoach && member.coachCode) {
    const students = await prisma.member
      .findMany({ where: { referredBy: member.coachCode }, select: { phone: true } })
      .catch(() => []);
    for (const s of students) {
      const sj = await hubGet(base, secret, s.phone);
      referral += Math.floor(num(sj?.total) / RP_PER_REFERRAL_ACE);
    }
  }

  const balance = num(j.balance ?? j.points) + referral;
  const nextTier = typeof j.nextTier === "string" ? j.nextTier : null;
  return {
    tier: typeof j.tier === "string" ? j.tier : DEFAULT.tier,
    tierLabel: typeof j.tierLabel === "string" ? j.tierLabel : DEFAULT.tierLabel,
    balance,
    rp: balance * ACE_VALUE,
    referral,
    nextTier,
    nextTierLabel: typeof j.nextTierLabel === "string" ? j.nextTierLabel : null,
    pct: Math.max(0, Math.min(100, num(j.pct))),
    spendToNext: num(j.spendToNext),
    nextBenefit: nextTier ? BENEFIT[nextTier] ?? null : null,
  };
}
