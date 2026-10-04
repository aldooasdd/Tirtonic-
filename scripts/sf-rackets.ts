/**
 * Seed RacketSpec dari docs/string-finder/data/rackets-seed.json (spec faktual).
 * Idempoten (upsert by slug). Jalankan: npm run sf:rackets
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = join(HERE, "../docs/string-finder/data/rackets-seed.json");

type Row = {
  slug: string; brand: string; model: string; headSizeSqin: number; weightG: number;
  pattern: string; stiffnessRa: number | null; tensionMinLbs: number; tensionMaxLbs: number;
  stringType: string; powerLevel: string; aliases: string[];
};

async function main() {
  const rows: Row[] = JSON.parse(readFileSync(FILE, "utf8"));
  for (const r of rows) {
    await prisma.racketSpec.upsert({ where: { slug: r.slug }, create: r, update: r });
  }
  console.log(`RacketSpec: ${rows.length} model ter-seed.`);
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
