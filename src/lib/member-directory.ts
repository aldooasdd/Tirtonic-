import "server-only";
import { prisma, safeQuery } from "@/lib/prisma";
import { normalizePhone } from "@/lib/string-finder/phone";
import { compute, tierFor, GREEN, RP_PER_REFERRAL_ACE, type Row } from "@/lib/tirtonichub-points";

// Direktori member untuk dashboard admin: gabungan nota offline hub (semua nomor sekaligus via ?all=1),
// order online tirtonic.com, stringing, + flag Member. Dipakai halaman daftar, detail, dan export CSV.
// ponytail: dibangun penuh tiap request (≈ ratusan–ribuan nomor). Tabel ringkasan kalau sudah puluhan ribu.

export type HubNota = { soldAt: string; grandTotal: number; branchName: string | null };

export type MemberRow = {
  phone: string;
  name: string | null;
  email: string | null;
  branch: string | null;
  joinedAt: Date | null;
  lastTx: Date | null;
  txCount: number; // nota offline + order online lunas
  stringCount: number;
  spendOffline: number;
  spendOnline: number;
  spend: number;
  spend12mo: number;
  tier: string; // White | Signature | Prive | Green
  points: number; // saldo (earned + referral − terpakai)
  isCoach: boolean;
  coachCode: string | null;
  referredBy: string | null;
  registered: boolean;
  hub: HubNota[];
};

export const TIER_LABEL: Record<string, string> = { White: "White", Signature: "Signature", Prive: "Privé", Green: "Green (Coach)" };
const PAID = new Set(["PAID", "SHIPPED", "DELIVERED"]);
const ACTIVE_MS = 365 * 24 * 60 * 60 * 1000;

// Nama sampah ("–", "-", isinya nomor HP) dianggap kosong.
const cleanName = (v: string | null | undefined) => {
  const n = (v ?? "").trim();
  return n && /[a-zA-Z]/.test(n) ? n : null;
};

// null = hub tak bisa dihubungi.
async function hubAll(): Promise<Record<string, { name: string | null; rows: HubNota[] }> | null> {
  const base = process.env.TIRTONICHUB_POINTS_URL;
  const secret = process.env.POINTS_API_SECRET;
  if (!base || !secret) return null;
  try {
    const u = new URL(base);
    u.searchParams.set("all", "1");
    // cache 60 dtk: ganti search/filter/halaman tak menembak hub berulang
    const res = await fetch(u, { headers: { "x-points-secret": secret }, next: { revalidate: 60 }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return ((await res.json()) as { members?: Record<string, { name: string | null; rows: HubNota[] }> }).members ?? {};
  } catch {
    return null;
  }
}

export async function memberDirectory(): Promise<{ rows: MemberRow[]; hubOnline: boolean }> {
  const [hubLive, sfRows, ordRows, memberRows, redeemed] = await Promise.all([
    hubAll(),
    safeQuery(() => prisma.sfOrder.findMany({ select: { phone: true, customerName: true, createdAt: true, status: true, branch: { select: { name: true } } }, orderBy: { createdAt: "asc" } }), []),
    safeQuery(() => prisma.order.findMany({ select: { telepon: true, nama: true, email: true, total: true, status: true, createdAt: true }, orderBy: { createdAt: "asc" } }), []),
    safeQuery(() => prisma.member.findMany(), []),
    safeQuery(() => prisma.pointRedemption.groupBy({ by: ["phone"], where: { status: "used" }, _sum: { points: true } }), []),
  ]);

  // Hub mati → salinan nota terakhir per nomor (tanpa cabang).
  let hub = hubLive;
  if (!hub) {
    const cache = await safeQuery(() => prisma.pointsCache.findMany(), []);
    hub = Object.fromEntries(
      cache.map((c) => [c.phone, { name: null, rows: ((c.rows as Row[]) ?? []).map((r) => ({ soldAt: new Date(r.t).toISOString(), grandTotal: r.amount, branchName: null })) }]),
    );
  }

  const map = new Map<string, MemberRow>();
  const get = (raw: string): MemberRow | null => {
    const p = normalizePhone(raw || "");
    if (!p) return null;
    let e = map.get(p);
    if (!e) {
      e = { phone: p, name: null, email: null, branch: null, joinedAt: null, lastTx: null, txCount: 0, stringCount: 0, spendOffline: 0, spendOnline: 0, spend: 0, spend12mo: 0, tier: "White", points: 0, isCoach: false, coachCode: null, referredBy: null, registered: false, hub: [] };
      map.set(p, e);
    }
    return e;
  };
  const seen = (e: MemberRow, d: Date, tx: boolean) => {
    if (!e.joinedAt || d < e.joinedAt) e.joinedAt = d;
    if (tx && (!e.lastTx || d > e.lastTx)) e.lastTx = d;
  };

  // urutan asc → nama/cabang/email terakhir menimpa yang lama
  for (const o of sfRows) {
    const e = get(o.phone);
    if (!e) continue;
    e.name = cleanName(o.customerName) ?? e.name;
    e.branch = o.branch?.name ?? e.branch;
    if (o.status !== "batal") e.stringCount++;
    seen(e, o.createdAt, o.status !== "batal");
  }
  for (const o of ordRows) {
    const e = get(o.telepon);
    if (!e) continue;
    e.name = cleanName(o.nama) ?? e.name;
    e.email = o.email || e.email;
    seen(e, o.createdAt, false);
    if (PAID.has(o.status)) {
      e.txCount++;
      e.spendOnline += o.total;
      seen(e, o.createdAt, true);
    }
  }
  for (const [phone, h] of Object.entries(hub)) {
    const e = get(phone);
    if (!e) continue;
    e.name = cleanName(h.name) ?? e.name;
    e.hub = h.rows;
    for (const r of h.rows) {
      e.branch = r.branchName ?? e.branch;
      seen(e, new Date(r.soldAt), true);
    }
  }
  for (const m of memberRows) {
    const e = get(m.phone);
    if (!e) continue;
    e.name = cleanName(m.name) ?? e.name; // nama yang di-set admin menang
    e.isCoach = m.isCoach;
    e.coachCode = m.coachCode;
    e.referredBy = m.referredBy;
    e.registered = true;
    seen(e, m.createdAt, false);
  }

  // Poin & tier — rumus sama dengan fetchAcePoints (poin hanya dari nota offline hub).
  const used = new Map(redeemed.map((r) => [r.phone, r._sum.points ?? 0]));
  const hubTotal = new Map<string, number>();
  for (const e of map.values()) {
    const rows: Row[] = e.hub.map((r) => ({ t: new Date(r.soldAt).getTime(), amount: r.grandTotal })).sort((a, b) => a.t - b.t);
    const c = compute(rows, e.isCoach ? GREEN.rpPerAce : Infinity);
    e.txCount += rows.length;
    e.spendOffline = c.total;
    e.spend = c.total + e.spendOnline;
    e.spend12mo = c.spend12mo;
    e.points = c.points;
    const t = tierFor(c.spend12mo);
    e.tier = e.isCoach && GREEN.rpPerAce < t.rpPerAce ? "Green" : t.name;
    hubTotal.set(e.phone, c.total);
  }
  // Referral coach: 2% belanja offline murid.
  const coaches = new Map([...map.values()].filter((c) => c.isCoach && c.coachCode).map((c) => [c.coachCode!, c]));
  for (const e of map.values()) {
    const coach = e.referredBy ? coaches.get(e.referredBy) : undefined;
    if (coach) coach.points += Math.floor((hubTotal.get(e.phone) ?? 0) / RP_PER_REFERRAL_ACE);
  }
  for (const e of map.values()) e.points = Math.max(0, e.points - (used.get(e.phone) ?? 0));

  return { rows: [...map.values()], hubOnline: !!hubLive };
}

export type MemberQuery = { q?: string; tier?: string; branch?: string; status?: string; from?: string; to?: string; sort?: string; filter?: string };

export function filterMembers(rows: MemberRow[], s: MemberQuery): MemberRow[] {
  const q = (s.q ?? "").trim().toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  const qPhone = qDigits ? (normalizePhone(qDigits) ?? qDigits.replace(/^0/, "62")) : "";
  const from = s.from ? new Date(s.from + "T00:00:00+07:00") : null;
  const to = s.to ? new Date(s.to + "T23:59:59+07:00") : null;
  const activeCut = Date.now() - ACTIVE_MS;
  const out = rows.filter((e) => {
    if (s.filter === "coach" && !e.isCoach) return false;
    if (q && !((e.name ?? "").toLowerCase().includes(q) || (qDigits.length >= 3 && (e.phone.includes(qDigits) || e.phone.includes(qPhone))))) return false;
    if (s.tier && e.tier !== s.tier) return false;
    if (s.branch && e.branch !== s.branch) return false;
    const active = !!e.lastTx && e.lastTx.getTime() > activeCut;
    if (s.status === "aktif" && !active) return false;
    if (s.status === "nonaktif" && active) return false;
    if (from && (!e.joinedAt || e.joinedAt < from)) return false;
    if (to && (!e.joinedAt || e.joinedAt > to)) return false;
    return true;
  });
  const t = (d: Date | null) => d?.getTime() ?? 0;
  const by: Record<string, (a: MemberRow, b: MemberRow) => number> = {
    terbaru: (a, b) => t(b.joinedAt) - t(a.joinedAt),
    poin: (a, b) => b.points - a.points,
    belanja: (a, b) => b.spend - a.spend,
    az: (a, b) => (a.name ?? "￿").localeCompare(b.name ?? "￿"),
  };
  return out.sort(by[s.sort ?? ""] ?? by.terbaru);
}
