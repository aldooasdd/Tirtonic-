// Susun /Users/a1/tirtonic-data/tambahan.json: skor lab untuk produk yang tidak ada di sumber utama X-Compare.
// Sumber: Extreme X-Compare (model sama / model terdekat), playtest Tennis Warehouse (dikalibrasi ke skala X-Compare).
// Pakai: NODE_PATH=node_modules node --env-file=.env scripts/build-tambahan.cjs  → lalu jalankan import-compare.cjs
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
const tanpaGrip = (w) => w.replace(/\s*(-\s*G\d?|\(G?\d?\)|\bG\d)\s*$/i, "").replace(/\s*\(\)\s*$/, "").trim();

const RK = ["Power", "Kontrol", "Kenyamanan", "Spin", "Toleransi", "Manuver", "Stabilitas"];
const SN = ["Power", "Kontrol", "Kenyamanan", "Spin", "Tahan tension", "Ketahanan"];
const SP = ["Kenyamanan", "Stabilitas", "Ketahanan", "Dinamis"];
const obj = (keys, vals) => Object.fromEntries(keys.map((k, i) => [k, vals[i]]).filter(([, v]) => v != null).map(([k, v]) => [k, Math.max(1, Math.min(100, Math.round(v)))]));
// Selisih rata-rata (X-Compare − TW×10) dari model yang ada di kedua sumber (11 raket, 10 senar). Sepatu TW≈X-Compare.
const twRaket = ([p, c, m, st, co, sp]) => obj(RK, [p - 5, c - 16, co - 19, sp - 19, null, m - 22, st - 5.5]);
const twSenar = ([p, c, co, sp, t, d]) => obj(SN, [p + 2.5, c - 20, co - 31.5, sp - 3, t - 4.6, d + 13.4]);
const E = (v) => obj(RK, v);
const X = "X-Compare Extreme Tennis", XD = "X-Compare Extreme Tennis (model terdekat)", TW = "Playtest Tennis Warehouse, dikalibrasi ke skala X-Compare";

// [kategori, regex nama produk, regex varian (null = seluruh produk), nilai, sumber, catatan]
const ATURAN = [
  ["raket", /Solinco Blackout Tennis/, /^100 \/ 300gr$/, E([86, 60, 53, 82, 68, 67, 79]), "extreme", X],
  ["raket", /Solinco Blackout Tennis/, /^100 \/ 285gr$/, E([85, 52, 57, 80, 63, 69, 78]), "extreme", X],
  ["raket", /Solinco Blackout Tennis/, /^100 \/ 265gr$/, E([85, 52, 57, 80, 63, 69, 78]), "extreme", XD],
  ["raket", /Solinco Blackout Tennis/, /XTD/, twRaket([93, 76, 77, 87, 79, 83]), "tw", TW],
  ["raket", /Solinco Whiteout (x Brain Dead )?Tennis/, /^98 ?\/ ?305g$/, E([75, 78, 73, 61, 67, 54, 86]), "extreme", X],
  ["raket", /Solinco Whiteout Tennis/, /^98 \/ 290g$/, E([67, 74, 70, 61, 62, 69, 74]), "extreme", X],
  ["raket", /Solinco Whiteout Tennis/, /^98 \/ 305g XTD$/, twRaket([88, 80, 76, 87, 77, 84]), "tw", TW],
  ["raket", /Solinco Whiteout Tennis/, /^98\/305 18x20$/, twRaket([83, 86, 84, 86, 83, 83]), "tw", TW],
  ["raket", /Head Extreme Tennis/, /^MP UL$/, E([70, 55, 56, 78, 63, 78, 65]), "extreme", X],
  ["raket", /Head Extreme Tennis/, /^TEAM$/, E([80, 51, 58, 94, 75, 73, 73]), "extreme", X],
  ["raket", /Head Extreme Tennis/, /^PRO$/, E([81, 64, 62, 67, 60, 66, 73]), "extreme", X],
  ["raket", /Head Extreme Tennis/, /^MP XL$/, twRaket([88, 84, 88, 88, 83, 88]), "tw", TW],
  ["raket", /Prince Beast x Smiley Pink/, /285/, E([82, 59, 61, 76, 67, 66, 75]), "extreme", XD],
  ["raket", /Prince Beast x Smiley Pink/, /270/, E([83, 51, 61, 71, 64, 60, 75]), "extreme", XD],
  ["raket", /Babolat Evo Aero/, /276/, E([68, 63, 59, 82, 67, 80, 60]), "extreme", XD],
  ["raket", /Babolat Evo Aero/, /260/, E([64, 61, 52, 82, 65, 85, 55]), "extreme", XD],
  ["raket", /Ezone Alpha Espresso/, /^Alpha \/ 275g$/, E([80, 48, 55, 79, 69, 75, 68]), "extreme", XD],
  ["raket", /Ezone Alpha Espresso/, /^Alpha L \/ 260g$/, E([74, 43, 57, 79, 62, 84, 56]), "extreme", XD],
  ["raket", /Ezone Alpha Espresso/, /^Alpha SL \/ 245g$/, E([68, 42, 59, 78, 61, 90, 53]), "extreme", XD],
  ["raket", /Head Power PWR 110/, null, E([88, 45, 54, 93, 86, 70, 76]), "extreme", XD],
  ["raket", /Prince Tour Tennis/, /^100\/310g$/, twRaket([81, 86, 89, 86, 88, 89]), "tw", TW],
  ["raket", /TFight Iga/, /^100\/300g$/, E([75, 68, 68, 61, 61, 65, 74]), "extreme", XD],
  ["raket", /TFight Iga/, /^98\/300g$/, twRaket([85, 82, 90, 80, 82, 89]), "tw", TW],
  ["raket", /Babolat Pure Aero Racket/, /^100 \/ 300g$|Lite/, twRaket([86, 82, 91, 85, 83, 93]), "tw", TW],
  ["raket", /Babolat Pure Aero Racket/, /^98 \/ 305g$/, twRaket([87, 87, 90, 85, 86, 92]), "tw", TW],
  ["raket", /Babolat Pure Strike Racket/, /^100\/300G$/i, twRaket([82, 84, 85, 82, 83, 85]), "tw", TW],
  ["raket", /Pure Drive Wimbledon/, null, twRaket([92, 79, 86, 80, 83, 87]), "tw", TW],
  ["raket", /Mizuno Acrospeed/, /300g/, twRaket([86, 81, 86, 85, 83, 85]), "tw", TW],
  ["raket", /Head Squared/, null, twRaket([81, 81, 94, 75, 84, 84]), "tw", TW],
  ["raket", /Pro Staff V14 RG/, /97/, twRaket([83, 85, 80, 88, 83, 86]), "tw", TW],

  ["senar", /Luxilon Alu Power RG/, null, obj(SN, [49, 63, 46, 79, 54, 100]), "extreme", X],
  ["senar", /Polytour Pro/, null, twSenar([45, 86, 72, 79, 83, 85]), "tw", TW],
  ["senar", /Polytour Rev/, null, twSenar([60, 88, 74, 85, 74, 91]), "tw", TW],
  ["senar", /RPM Blast/, null, twSenar([52, 89, 59, 90, 50, 84]), "tw", TW],
  ["senar", /RPM Rough/, null, twSenar([62, 65, 66, 90, 40, 79]), "tw", TW],
  ["senar", /Grapplesnake Alpha/, null, twSenar([85, 85, 91, 90, 87, 88]), "tw", TW],
  ["senar", /Black Fire/i, null, twSenar([33, 95, 70, 74, 72, 85]), "tw", TW],
  ["senar", /O-Toro Spin/i, null, twSenar([71, 89, 84, 70, 78, 85]), "tw", TW],
  ["senar", /O-Toro(?! ?(Snap|Octa))/i, null, twSenar([55, 94, 75, 92, 79, 82]), "tw", TW],

  ["sepatu", /AG-LT Ultra/, null, obj(SP, [88, 86, 78, 82]), "extreme", X],
  ["sepatu", /Coco Gauff CG2/, null, obj(SP, [85, 88, 88, 87]), "extreme", X],
  ["sepatu", /Resolution X/, null, obj(SP, [82, 91, 93, 72]), "extreme", XD],
  ["sepatu", /New Balance 996/, null, obj(SP, [86, 82, 80, 85]), "extreme", XD],
  ["sepatu", /Wave Enforce Court/, null, obj(SP, [88, 71, 74, 85]), "tw", TW],
  ["sepatu", /Wave Enforce Tour/, null, obj(SP, [91, 85, 84, 83]), "tw", TW],
  ["sepatu", /Wave Exceed Tour 7/, null, obj(SP, [87, 79, 79, 86]), "tw", TW],
  ["sepatu", /Wave Exceed Tour 6/, null, obj(SP, [87, 79, 72, 93]), "tw", TW],
  ["sepatu", /Vapor Pro 3/, null, obj(SP, [89, 84, 80, 81]), "tw", TW],
  ["sepatu", /AD-ACCEL/i, null, obj(SP, [86, 91, 84, 86]), "tw", TW],
  ["sepatu", /Ultrashot Team/, null, obj(SP, [85, 74, 80, 90]), "tw", TW],
];
const KAT = { raket: "Raket Tenis", senar: "String", sepatu: "Sepatu Tenis" };

(async () => {
  const out = [], kena = new Set();
  for (const [kat, reNama, reVar, nilai, sumber, catatan] of ATURAN) {
    const ps = await db.product.findMany({ where: { kategori: KAT[kat] }, select: { id: true, nama: true, variants: { select: { warna: true } } } });
    for (const p of ps.filter((p) => reNama.test(p.nama))) {
      const vs = [...new Set(p.variants.map((v) => tanpaGrip(v.warna)))];
      // varian dipakai hanya untuk raket bervarian (sama dengan import-compare); senar/sepatu = seluruh produk
      const target = kat === "raket" && p.variants.length && vs.some(Boolean) ? (reVar ? vs.filter((v) => reVar.test(v)) : vs) : [""];
      for (const varian of target) {
        const k = `${p.id}|${varian}`;
        if (kena.has(k)) continue;
        kena.add(k);
        const v = Object.values(nilai);
        out.push({ productId: p.id, nama: p.nama, varian, kategori: kat, skor: Math.round(v.reduce((a, b) => a + b, 0) / v.length), nilai, sumber, catatan });
      }
    }
  }
  fs.writeFileSync("/Users/a1/tirtonic-data/tambahan.json", JSON.stringify(out, null, 1));
  const per = {};
  for (const r of out) per[r.kategori] = (per[r.kategori] || 0) + 1;
  console.log("baris", out.length, per);
  await db.$disconnect();
})();
