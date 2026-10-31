import "server-only";
import { prisma } from "@/lib/prisma";

// Ace Points pelanggan = gabungan transaksi OFFLINE (invoice Tirtonichub via hub)
// + ONLINE (Order toko tirtonic.com yang sudah dibayar). Semua orang yang transaksi
// otomatis "member"; tier dari belanja 12 bln berjalan (akumulasi), mulai 1 Nov 2026 WIB.
// 1 Ace = Rp1.000. Poin/transaksi = floor(nilai / rupiah-per-Ace tier saat itu).
// Flag coach (Member.isCoach) → rate Green; + referral 2% belanja murid.
// Env hub: TIRTONICHUB_POINTS_URL + POINTS_API_SECRET (offline). Hub mati → hitung online saja.

const ACE_VALUE = 1000;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const SINCE = new Date("2026-10-31T17:00:00.000Z"); // 1 Nov 2026 00:00 WIB
const RP_PER_REFERRAL_ACE = 50_000; // coach 2% × (Rp1.000/Ace) = belanja / 50.000

// Tier berbasis belanja 12 bln. rpPerAce = rupiah belanja untuk 1 Ace. (mirror konfig hub)
const TIERS = [
  { name: "Prive", label: "Tirtonic Privé", qualify: 50_000_000, rpPerAce: 40_000 },
  { name: "Signature", label: "Tirtonic Signature", qualify: 15_000_000, rpPerAce: 65_000 },
  { name: "White", label: "Tirtonic White", qualify: 0, rpPerAce: 100_000 },
] as const;
const GREEN = { name: "Green", label: "Tirtonic Green (Coach)", rpPerAce: 50_000 };
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
};

const DEFAULT: AcePoints = {
  tier: "White",
  tierLabel: "Tirtonic White",
  balance: 0,
  rp: 0,
  referral: 0,
  redeemed: 0,
  nextTier: "Signature",
  nextTierLabel: "Tirtonic Signature",
  pct: 0,
  spendToNext: 15_000_000,
  nextBenefit: BENEFIT.Signature,
};

type Row = { t: number; amount: number };

// Nomor bisa tersimpan beda bentuk di Order.telepon (62.., 0.., 8..) — cari semua varian.
function phoneVariants(phone: string): string[] {
  const rest = phone.startsWith("62") ? phone.slice(2) : phone;
  return Array.from(new Set([phone, "0" + rest, rest, "+" + phone]));
}

// Transaksi gabungan (offline hub + online Order), urut waktu naik.
async function rowsFor(phone: string, base?: string, secret?: string): Promise<Row[]> {
  const out: Row[] = [];
  if (base && secret) {
    try {
      const u = new URL(base);
      u.searchParams.set("phone", phone);
      u.searchParams.set("raw", "1");
      const res = await fetch(u, { headers: { "x-points-secret": secret }, cache: "no-store" });
      if (res.ok) {
        const j = (await res.json()) as { rows?: { soldAt: string; grandTotal: number }[] };
        for (const r of j.rows ?? []) out.push({ t: new Date(r.soldAt).getTime(), amount: r.grandTotal });
      }
    } catch {
      /* hub mati → online saja */
    }
  }
  // Online: Order dibayar sejak loyalty mulai, belum dibatalkan. Basis poin = produk net (tanpa ongkir).
  const orders = await prisma.order
    .findMany({
      where: { telepon: { in: phoneVariants(phone) }, status: { not: "CANCELLED" }, paidAt: { not: null, gte: SINCE } },
      select: { paidAt: true, subtotal: true, diskon: true },
    })
    .catch(() => [] as { paidAt: Date | null; subtotal: number; diskon: number }[]);
  for (const o of orders) if (o.paidAt) out.push({ t: new Date(o.paidAt).getTime(), amount: Math.max(0, o.subtotal - o.diskon) });

  return out.sort((a, b) => a.t - b.t);
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
  };
}
