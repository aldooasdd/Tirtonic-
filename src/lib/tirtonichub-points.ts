import "server-only";

// Ace Points pelanggan dari API Tirtonichub (lintas-repo, DB terpisah).
// Semua hitung (tier, rate, saldo, progres) dilakukan di Tirtonichub; di sini cuma ambil + tampil.
// 1 Ace = Rp1.000. Tier dari belanja 12 bln berjalan saat nota dibuat. Mulai 1 Nov 2026 WIB.
// Env: TIRTONICHUB_POINTS_URL (mis. https://hub.tirtonic.com/api/points) + POINTS_API_SECRET.
// Hub mati / belum diset → default White saldo 0 (dashboard tetap jalan).

export type AcePoints = {
  tier: string;
  tierLabel: string;
  balance: number;
  rp: number;
  nextTier: string | null;
  nextTierLabel: string | null;
  pct: number; // progres belanja ke tier berikutnya (0..100)
  spendToNext: number; // rupiah belanja lagi menuju tier berikutnya
  nextBenefit: string | null;
};

// Benefit ringkas per tier (buat label "menuju ...").
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
  nextTier: "Signature",
  nextTierLabel: "Tirtonic Signature",
  pct: 0,
  spendToNext: 15_000_000,
  nextBenefit: BENEFIT.Signature,
};

const num = (v: unknown, d = 0) => (typeof v === "number" && isFinite(v) ? v : d);

export async function fetchAcePoints(phone: string | null): Promise<AcePoints> {
  const base = process.env.TIRTONICHUB_POINTS_URL;
  const secret = process.env.POINTS_API_SECRET;
  if (!base || !secret || !phone) return DEFAULT;
  try {
    const u = new URL(base);
    u.searchParams.set("phone", phone);
    const res = await fetch(u, { headers: { "x-points-secret": secret }, cache: "no-store" });
    if (!res.ok) return DEFAULT;
    const j = (await res.json()) as Record<string, unknown>;
    const nextTier = typeof j.nextTier === "string" ? j.nextTier : null;
    return {
      tier: typeof j.tier === "string" ? j.tier : DEFAULT.tier,
      tierLabel: typeof j.tierLabel === "string" ? j.tierLabel : DEFAULT.tierLabel,
      balance: num(j.balance ?? j.points),
      rp: num(j.rp),
      nextTier,
      nextTierLabel: typeof j.nextTierLabel === "string" ? j.nextTierLabel : null,
      pct: Math.max(0, Math.min(100, num(j.pct))),
      spendToNext: num(j.spendToNext),
      nextBenefit: nextTier ? BENEFIT[nextTier] ?? null : null,
    };
  } catch {
    return DEFAULT; // ponytail: diam kalau hub mati; tampil default, sisanya tetap jalan
  }
}
