/**
 * String Finder — impor data lab TWU ke DB (TwuString + TwuMeasurement).
 * Sumber: docs/string-finder/data/web-strings-priced.csv (senar yg ada di web Tirtonic).
 * Kolom price_idr / in_stock DIABAIKAN — harga & stok diambil live dari Product (lihat sf-seed.ts).
 * Baris dobel (name+tension+swing sama) dirata-rata. Jalankan: npm run sf:import
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const HERE = dirname(fileURLToPath(import.meta.url));
const CSV = join(HERE, "../docs/string-finder/data/web-strings-priced.csv");
const DATASET_VERSION = process.env.DATASET_VERSION || "twu-web-2026-10";

const SWING: Record<string, string> = { Slow: "S", Medium: "M", Fast: "F" };
const num = (x: string): number | null => {
  const s = (x ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const avg = (a: number[]): number | null => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);

async function main() {
  const lines = readFileSync(CSV, "utf8").split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",");
  const col = (n: string) => header.indexOf(n);
  const ci = {
    name: col("string"), family: col("family"), material: col("material"),
    gauge: col("gauge_mm"), coverage: col("data_coverage"),
    tension: col("tension_lbs"), swing: col("swing"),
    st: col("stiffness_lb_in"), tl: col("tension_loss_pct"), er: col("energy_return_pct"),
    dw: col("dwell_time_ms"), sp: col("spin_potential"),
  };

  const meta = new Map<string, { family: string; material: string; gauge: number | null; coverage: string }>();
  type Acc = { st: number[]; tl: number[]; er: number[]; dw: number[]; sp: number[] };
  const acc = new Map<string, { name: string; tension: number; swing: string; v: Acc }>();

  for (let i = 1; i < lines.length; i++) {
    const r = lines[i].split(",");
    const name = r[ci.name];
    if (!name) continue;
    if (!meta.has(name)) meta.set(name, { family: r[ci.family], material: r[ci.material], gauge: num(r[ci.gauge]), coverage: r[ci.coverage] });
    const tension = parseInt(r[ci.tension], 10);
    const swing = SWING[r[ci.swing]] ?? r[ci.swing];
    if (!Number.isFinite(tension) || !swing) continue; // baris meta-only (senar tanpa_data) → tak ada measurement
    const key = `${name}|${tension}|${swing}`;
    let a = acc.get(key);
    if (!a) { a = { name, tension, swing, v: { st: [], tl: [], er: [], dw: [], sp: [] } }; acc.set(key, a); }
    const push = (arr: number[], val: number | null) => { if (val != null) arr.push(val); };
    push(a.v.st, num(r[ci.st])); push(a.v.tl, num(r[ci.tl])); push(a.v.er, num(r[ci.er]));
    push(a.v.dw, num(r[ci.dw])); push(a.v.sp, num(r[ci.sp]));
  }

  console.log(`strings: ${meta.size} | measurement groups: ${acc.size}`);
  await prisma.twuMeasurement.deleteMany();
  await prisma.twuString.deleteMany();

  const nameToId = new Map<string, string>();
  for (const [name, m] of meta) {
    const s = await prisma.twuString.create({
      data: { name, family: m.family, material: m.material, gaugeMm: m.gauge, dataCoverage: m.coverage, datasetVersion: DATASET_VERSION },
    });
    nameToId.set(name, s.id);
  }

  const rows = [...acc.values()].map((a) => ({
    stringId: nameToId.get(a.name)!, tensionLbs: a.tension, swing: a.swing,
    stiffnessLbIn: avg(a.v.st), tensionLossPct: avg(a.v.tl), energyReturnPct: avg(a.v.er),
    dwellTimeMs: avg(a.v.dw), spinPotential: avg(a.v.sp),
  }));
  for (let i = 0; i < rows.length; i += 1000) await prisma.twuMeasurement.createMany({ data: rows.slice(i, i + 1000) });
  console.log(`measurements: ${rows.length} | datasetVersion: ${DATASET_VERSION}`);
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
