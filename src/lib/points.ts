// Ace Points — sistem poin loyalty customer (Fase 1: derived dari jumlah stringing).
// Balance = (jumlah stringing non-batal × PT_PER_STRING) − poin terpakai.
// Fase 2: poin terpakai dari tabel PointRedemption (sekarang selalu 0).
// ponytail: tier & rate statis di sini; pindah ke config kalau perlu diubah admin.

export const PT_PER_STRING = 50;
export const RP_PER_PT = 100; // 1 poin = Rp100 (1.450 pts = Rp145.000, ikut mockup)

const TIERS = [
  { name: "Signature Tier", min: 0, benefit: "Akses antrean prioritas" },
  { name: "Pro Tier", min: 500, benefit: "Diskon senar 5%" },
  { name: "Deuce Black Tier", min: 2000, benefit: "Free Grip & Lab Access" },
  { name: "Grand Slam Tier", min: 5000, benefit: "Free Stringing bulanan" },
] as const;

export type AcePoints = {
  earned: number;
  balance: number;
  rp: number;
  tier: string;
  nextTier: string | null;
  nextBenefit: string | null;
  pct: number; // progres ke tier berikutnya (0..100)
  toNext: number; // poin lagi menuju tier berikutnya
};

export function acePoints(stringCount: number, redeemed = 0): AcePoints {
  const earned = Math.max(0, stringCount) * PT_PER_STRING;
  const balance = Math.max(0, earned - redeemed);
  let i = 0;
  for (let k = 0; k < TIERS.length; k++) if (balance >= TIERS[k].min) i = k;
  const cur = TIERS[i];
  const next = TIERS[i + 1] ?? null;
  const pct = next ? Math.round(((balance - cur.min) / (next.min - cur.min)) * 100) : 100;
  return {
    earned,
    balance,
    rp: balance * RP_PER_PT,
    tier: cur.name,
    nextTier: next?.name ?? null,
    nextBenefit: next?.benefit ?? null,
    pct: Math.max(0, Math.min(100, pct)),
    toNext: next ? Math.max(0, next.min - balance) : 0,
  };
}

// demo self-check (ponytail): jalankan `node --import tsx src/lib/points.ts` tak perlu; cek manual logika tier.
// 29 stringing → 1450 pts → Deuce Black belum (min 2000), tier Pro (min 500), toNext 550, pct 63%.
