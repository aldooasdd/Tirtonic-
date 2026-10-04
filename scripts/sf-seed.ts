/**
 * String Finder — seed aturan + branch + petakan TwuString.productId → Product.
 * Harga & stok TIDAK disimpan di TwuString; diambil live dari Product saat rekomendasi.
 * Jalankan SETELAH sf:import. Idempoten. Jalankan: npm run sf:seed
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const HERE = dirname(fileURLToPath(import.meta.url));
const RULES = join(HERE, "../docs/string-finder/reference/rules.json");

const NOISE = /\b(senar|tenis|tennis|string|potongan|reel|original|ori|meter|12m|\d+m|roll|set|pack|isi|edition|hybrid)\b/gi;
const base = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(NOISE, " ").replace(/\s+/g, " ").trim();
const compact = (s: string) => base(s).replace(/ /g, "");

// produk yg namanya beda dikit tapi = family TWU tertentu (lihat gen CSV)
const ALIAS: Record<string, string> = {
  "signum pro plasma pure": "signum pro poly plasma pure",
  "babolat rpm rough": "babolat rpm blast rough",
  "volkl classic synthetic gut": "volkl synthetic gut",
};

async function main() {
  // 1) SfRuleSet aktif dari rules.json
  const rules = JSON.parse(readFileSync(RULES, "utf8"));
  const version: number = rules.version;
  await prisma.sfRuleSet.updateMany({ data: { isActive: false }, where: { isActive: true } });
  await prisma.sfRuleSet.upsert({
    where: { version },
    create: { version, config: rules as Prisma.InputJsonValue, isActive: true, note: "seed dari rules.json" },
    update: { config: rules as Prisma.InputJsonValue, isActive: true },
  });
  console.log(`SfRuleSet v${version} aktif.`);

  // 2) Branch default (website = 1 cabang online)
  await prisma.sfBranch.upsert({
    where: { slug: "tirtonic" },
    create: { name: "Tirtonic", slug: "tirtonic", paperMm: "58", etaMinutes: 30, isActive: true },
    update: {},
  });
  console.log("SfBranch 'tirtonic' siap.");

  // 3) Petakan productId
  const strings = await prisma.twuString.findMany({ select: { id: true, name: true, family: true, dataCoverage: true } });
  const products = await prisma.product.findMany({
    where: { kategori: { contains: "String", mode: "insensitive" } },
    select: { id: true, nama: true, harga: true, hargaDiskon: true, status: true, stok: true },
  });
  const prod = products.map((p) => ({
    id: p.id, base: base(p.nama), compact: compact(p.nama),
    price: p.hargaDiskon ?? p.harga,
    inStock: p.status !== "SOLD" && (p.stok == null || p.stok > 0),
  }));

  // family TWU unik (bukan tanpa_data) utk pencocokan, panjang dulu
  const realFamilies = [...new Set(strings.filter((s) => s.dataCoverage !== "tanpa_data").map((s) => s.family))]
    .map((f) => ({ f, c: compact(f) })).sort((a, b) => b.c.length - a.c.length);

  // tiap produk web -> family TWU
  const famToProducts: Record<string, typeof prod> = {};
  for (const p of prod) {
    const alias = ALIAS[p.base];
    let fam: string | null = null;
    if (alias) fam = alias;
    else { const hit = realFamilies.find((x) => x.c.length >= 5 && (p.compact.includes(x.c) || x.c.includes(p.compact))); fam = hit ? hit.f : p.base; }
    (famToProducts[fam] ||= []).push(p);
  }

  // representatif per family: in-stock dulu, lalu termurah
  const famToRep: Record<string, string> = {};
  for (const [fam, ps] of Object.entries(famToProducts)) {
    ps.sort((a, b) => Number(b.inStock) - Number(a.inStock) || a.price - b.price);
    famToRep[fam] = ps[0].id;
  }

  let set = 0, miss = 0;
  for (const s of strings) {
    const repId = famToRep[s.family];
    if (repId) { await prisma.twuString.update({ where: { id: s.id }, data: { productId: repId } }); set++; }
    else miss++;
  }
  console.log(`productId terpasang: ${set} | tanpa produk: ${miss}`);
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
