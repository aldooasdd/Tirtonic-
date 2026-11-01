import "server-only";
import { prisma } from "@/lib/prisma";

// Ace Points pelanggan = gabungan transaksi OFFLINE (invoice Tirtonichub via hub)
// + ONLINE (Order toko tirtonic.com yang sudah dibayar). Semua orang yang transaksi
// otomatis "member"; tier dari belanja 12 bln berjalan (akumulasi), mulai 1 Nov 2026 WIB.
// 1 Ace = Rp1.000. Poin/transaksi = floor(nilai / rupiah-per-Ace tier saat itu).
// Flag coach (Member.isCoach) → rate Green; + referral 2% belanja murid.
// Env hub: TIRTONICHUB_POINTS_URL + POINTS_API_SECRET (offline). Hub mati → pakai salinan terakhir (PointsCache).

const ACE_VALUE = 1000;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const SINCE = new Date("2026-10-31T17:00:00.000Z"); // 1 Nov 2026 00:00 WIB
const RP_PER_REFERRAL_ACE = 50_000; // coach 2% × (Rp1.000/Ace) = belanja / 50.000

// Tier berbasis belanja 12 bln. rpPerAce = rupiah belanja untuk 1 Ace. (mirror konfig hub)
const TIERS = [
  { name: "Prive", label: "Tirtonic Privé Card", qualify: 100_000_000, rpPerAce: 40_000 },
  { name: "Signature", label: "Tirtonic Signature Card", qualify: 30_000_000, rpPerAce: 65_000 },
  { name: "White", label: "Tirtonic White Card", qualify: 0, rpPerAce: 100_000 },
] as const;
const GREEN = { name: "Green", label: "Tirtonic Green Card", rpPerAce: 50_000 };
const tierFor = (spend12mo: number) => TIERS.find((t) => spend12mo >= t.qualify) ?? TIERS[TIERS.length - 1];

const BENEFIT: Record<string, string> = {
  White: "Poin belanja 1%",
  Signature: "Poin 1,5% + antrean prioritas",
  Prive: "Poin 2,5% + benefit eksklusif",
  Green: "Poin 2% + kode referral",
};

export type AcePoints = {
  tier: string;
  tierLabel: string;
  balance: number; // saldo tersedia (earned + referral − terpakai)
  rp: number;
  referral: number;
  redeemed: number; // Ace sudah dipakai (redemption status "used")
  nextTier: string | null;
  nextTierLabel: string | null;
  pct: number;
  spendToNext: number;
  nextBenefit: string | null;
  spend12mo: number; // belanja 12 bln berjalan (buat progress tiap tier)
  isCoach: boolean;
};

const DEFAULT: AcePoints = {
  tier: "White",
  tierLabel: "Tirtonic White Card",
  balance: 0,
  rp: 0,
  referral: 0,
  redeemed: 0,
  nextTier: "Signature",
  nextTierLabel: "Tirtonic Signature Card",
  pct: 0,
  spendToNext: 30_000_000,
  nextBenefit: BENEFIT.Signature,
  spend12mo: 0,
  isCoach: false,
};

type Row = { t: number; amount: number };

// Poin HANYA dari Rekap Penjualan Tirtonichub (nota offline hub), per keputusan owner.
// Transaksi tirtonic.com (Order online & stringing) TIDAK dihitung.
async function rowsFor(phone: string, base?: string, secret?: string): Promise<Row[]> {
  const rows = (await hubRows(phone, base, secret)) ?? (await cachedRows(phone));
  return rows.sort((a, b) => a.t - b.t);
}

// null = hub tak bisa dihubungi (beda dgn nomor tanpa nota). Sukses → salinan disimpan.
async function hubRows(phone: string, base?: string, secret?: string): Promise<Row[] | null> {
  if (!base || !secret) return null;
  try {
    const u = new URL(base);
    u.searchParams.set("phone", phone);
    u.searchParams.set("raw", "1");
    const res = await fetch(u, { headers: { "x-points-secret": secret }, cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const j = (await res.json()) as { rows?: { soldAt: string; grandTotal: number }[] };
    const rows = (j.rows ?? []).map((r) => ({ t: new Date(r.soldAt).getTime(), amount: r.grandTotal }));
    await prisma.pointsCache
      .upsert({ where: { phone }, create: { phone, rows }, update: { rows } })
      .catch(() => null);
    return rows;
  } catch {
    return null;
  }
}

// PC hub mati → pakai nota terakhir yang berhasil diambil, biar poin tak jadi 0.
async function cachedRows(phone: string): Promise<Row[]> {
  const c = await prisma.pointsCache.findUnique({ where: { phone } }).catch(() => null);
  return (c?.rows as Row[] | undefined) ?? [];
}

// Hitung poin + belanja dari baris transaksi. tier tiap baris dari belanja 12 bln sampai baris itu.
// ponytail: O(n²) per nomor (transaksi sedikit). Prefix-sum kalau pernah ribuan.
function compute(rows: Row[], flagRate: number) {
  let points = 0;
  for (let i = 0; i < rows.length; i++) {
    const t = rows[i].t;
    let window = 0;
    for (let j = 0; j <= i; j++) if (rows[j].t > t - YEAR_MS) window += rows[j].amount;
    points += Math.floor(rows[i].amount / Math.min(tierFor(window).rpPerAce, flagRate));
  }
  const cutoff = Date.now() - YEAR_MS;
  const spend12mo = rows.reduce((s, r) => (r.t > cutoff ? s + r.amount : s), 0);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return { points, spend12mo, total };
}

export async function fetchAcePoints(phone: string | null): Promise<AcePoints> {
  if (!phone) return DEFAULT;
  const base = process.env.TIRTONICHUB_POINTS_URL;
  const secret = process.env.POINTS_API_SECRET;

  const member = await prisma.member.findUnique({ where: { phone } }).catch(() => null);
  const flagRate = member?.isCoach ? GREEN.rpPerAce : Infinity; // undangan Privé dimatikan

  const self = compute(await rowsFor(phone, base, secret), flagRate);

  // Referral: coach dapat 2% belanja tiap murid (referredBy = coachCode-nya).
  let referral = 0;
  if (member?.isCoach && member.coachCode) {
    const students = await prisma.member
      .findMany({ where: { referredBy: member.coachCode }, select: { phone: true } })
      .catch(() => []);
    for (const s of students) {
      const st = compute(await rowsFor(s.phone, base, secret), Infinity);
      referral += Math.floor(st.total / RP_PER_REFERRAL_ACE);
    }
  }

  // Poin terpakai (redemption yang sudah dikonfirmasi kasir).
  const redeemed = (await prisma.pointRedemption
    .aggregate({ where: { phone, status: "used" }, _sum: { points: true } })
    .catch(() => null))?._sum.points ?? 0;
  const balance = Math.max(0, self.points + referral - redeemed);

  // Tier tampil: tier belanja, dinaikkan flag coach kalau rate lebih bagus.
  let cur: { name: string; label: string; rpPerAce: number } = tierFor(self.spend12mo);
  let flagged = false;
  if (member?.isCoach && GREEN.rpPerAce < cur.rpPerAce) { cur = GREEN; flagged = true; }
  const next = flagged ? null : (TIERS[TIERS.indexOf(cur as (typeof TIERS)[number]) - 1] ?? null);

  return {
    tier: cur.name,
    tierLabel: cur.label,
    balance,
    rp: balance * ACE_VALUE,
    referral,
    redeemed,
    nextTier: next?.name ?? null,
    nextTierLabel: next?.label ?? null,
    pct: next ? Math.max(0, Math.min(100, Math.round((self.spend12mo / next.qualify) * 100))) : 100,
    spendToNext: next ? Math.max(0, next.qualify - self.spend12mo) : 0,
    nextBenefit: next ? BENEFIT[next.name] ?? null : null,
    spend12mo: self.spend12mo,
    isCoach: !!member?.isCoach,
  };
}
