/**
 * Seed: SfRuleSet aktif dari reference/rules.json + SfBranch Yogyakarta, Solo, Semarang (paperMm 58).
 * Jalankan: npm run seed
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const HERE = dirname(fileURLToPath(import.meta.url));
const rules = JSON.parse(readFileSync(join(HERE, "../docs/string-finder/reference/rules.json"), "utf8"));

const branches = [
  { name: "Yogyakarta", slug: "yogyakarta", paperMm: "58", isActive: true },
  { name: "Solo", slug: "solo", paperMm: "58", isActive: true },
  { name: "Semarang", slug: "semarang", paperMm: "58", isActive: true },
];

async function main() {
  await prisma.sfRuleSet.updateMany({ data: { isActive: false } });
  await prisma.sfRuleSet.upsert({
    where: { version: rules.version },
    update: { config: rules as Prisma.InputJsonValue, isActive: true, note: "seed dari reference/rules.json" },
    create: { version: rules.version, config: rules as Prisma.InputJsonValue, isActive: true, note: "seed dari reference/rules.json" },
  });
  for (const b of branches) {
    await prisma.sfBranch.upsert({ where: { slug: b.slug }, update: { name: b.name, paperMm: b.paperMm, isActive: b.isActive }, create: b });
  }
  console.log("seeded rules v" + rules.version + " | branches:", await prisma.sfBranch.count());
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
