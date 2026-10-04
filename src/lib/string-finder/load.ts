/**
 * Muat dataset & aturan aktif dari database, bangun struktur yang sama dengan data/strings.json,
 * hitung persentil sekali (prepare), lalu cache di memori. Cache di-invalidate saat data/aturan berubah.
 */
import { prisma } from "../prisma";
import { CONDITIONS, prepare, type Prepared } from "./engine";
import type { Dataset, Rules, Slice, Swing } from "./types";

const SWING_MAP: Record<string, Swing> = { Slow: "S", Medium: "M", Fast: "F", S: "S", M: "M", F: "F" };

export async function buildDatasetFromDb(): Promise<{ data: Dataset; datasetVersion: string }> {
  // Harga & stok diambil live dari Product (JOIN via productId). Senar yang produknya
  // habis stok / tak terpetakan TIDAK ikut dipertimbangkan mesin.
  const all = await prisma.twuString.findMany({
    orderBy: { name: "asc" },
    include: { measurements: true, product: { select: { harga: true, hargaDiskon: true, status: true, stok: true } } },
  });
  const rows = all.filter((r) => r.product && r.product.status !== "SOLD" && (r.product.stok == null || r.product.stok > 0));
  const strings = rows.map((r) => ({
    n: r.name, f: r.family, m: r.material, c: r.dataCoverage, g: r.gaugeMm,
    p: r.product!.hargaDiskon ?? r.product!.harga,
  }));
  const slices: Record<string, Slice> = {};
  for (const c of CONDITIONS) slices[c] = { st: [], tl: [], er: [], dw: [], sp: [] };
  rows.forEach((r, i) => {
    for (const c of CONDITIONS) {
      slices[c].st[i] = null;
      slices[c].tl[i] = null;
      slices[c].er[i] = null;
      slices[c].dw[i] = null;
      slices[c].sp[i] = null;
    }
    for (const m of r.measurements) {
      const cond = `${m.tensionLbs}${SWING_MAP[m.swing] ?? m.swing}`;
      if (!slices[cond]) continue;
      slices[cond].st[i] = m.stiffnessLbIn;
      slices[cond].tl[i] = m.tensionLossPct;
      slices[cond].er[i] = m.energyReturnPct;
      slices[cond].dw[i] = m.dwellTimeMs;
      slices[cond].sp[i] = m.spinPotential;
    }
  });
  return { data: { strings, slices }, datasetVersion: rows[0]?.datasetVersion ?? "unknown" };
}

export async function getActiveRules(): Promise<{ rules: Rules; version: number }> {
  const rs = await prisma.sfRuleSet.findFirst({ where: { isActive: true }, orderBy: { version: "desc" } });
  if (!rs) throw new Error("Tidak ada SfRuleSet aktif. Jalankan `npm run seed`.");
  return { rules: rs.config as unknown as Rules, version: rs.version };
}

interface EngineCache {
  prepared: Prepared;
  rules: Rules;
  ruleVersion: number;
  datasetVersion: string;
}

let cache: EngineCache | null = null;

let loading: Promise<EngineCache> | null = null;

export async function getEngine(): Promise<EngineCache> {
  if (cache) return cache;
  // Satu pemuatan dipakai bersama semua request yang datang bersamaan (hindari load ganda).
  if (!loading) {
    loading = (async () => {
      // Sekuensial: dengan connection_limit=1 (pgbouncer), query paralel saling menunggu → pool timeout.
      const { rules, version } = await getActiveRules();
      const { data, datasetVersion } = await buildDatasetFromDb();
      cache = { prepared: prepare(data), rules, ruleVersion: version, datasetVersion };
      return cache;
    })().finally(() => {
      loading = null;
    });
  }
  return loading;
}

export function invalidateEngineCache(): void {
  cache = null;
}
