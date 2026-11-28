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

  // produk baru masuk 17–21 Nov 2026
  ["raket", /Head Radical Tennis/, /^TEAM$/, E([66, 64, 69, 82, 68, 83, 62]), "extreme", X],
  ["raket", /Head Radical Tennis/, /^MP$/, E([74, 72, 64, 61, 66, 66, 79]), "extreme", X],
  ["raket", /Head Radical Tennis/, /^TEAM L$/, E([66, 64, 69, 82, 68, 83, 62]), "extreme", XD],
  ["raket", /Boom MP Arthur Ashe/, null, E([80, 63, 66, 77, 68, 71, 72]), "extreme", XD],
  ["raket", /Shift Roland Garros 2025/, null, E([75, 69, 59, 71, 61, 70, 70]), "extreme", X],
  ["raket", /Shift 99L V1 Year Of The Horse/, null, E([75, 69, 59, 71, 61, 70, 70]), "extreme", XD],
  ["raket", /Babolat Boost Aero/, null, E([71, 56, 59, 80, 67, 75, 68]), "extreme", X],
  ["raket", /Babolat Pure Drive Tennis Racket/, /^100 \/ 300g$|^100 \/ 285g$/, twRaket([92, 79, 86, 80, 83, 87]), "tw", TW],
  ["raket", /Babolat Pure Drive Tennis Racket/, /^98 \/ 305g$/, twRaket([87, 82, 84, 85, 78, 85]), "tw", TW],
  ["raket", /Pure Drive 30th Anniversary/, null, twRaket([92, 79, 86, 80, 83, 87]), "tw", TW],
  ["raket", /Pure Strike VS/, null, twRaket([82, 84, 85, 82, 83, 85]), "tw", TW],
  ["sepatu", /Vapor 12/, null, obj(SP, [84, 83, 82, 88]), "tw", TW],
  ["senar", /Luxilon Alu Power RG/, null, obj(SN, [49, 63, 46, 79, 54, 100]), "extreme", X],
  ["senar", /Polytour Pro/, null, twSenar([45, 86, 72, 79, 83, 85]), "tw", TW],
  ["senar", /Polytour Rev/, null, twSenar([60, 88, 74, 85, 74, 91]), "tw", TW],
  ["senar", /RPM Blast/, null, twSenar([52, 89, 59, 90, 50, 84]), "tw", TW],
  ["senar", /RPM Rough/, null, twSenar([62, 65, 66, 90, 40, 79]), "tw", TW],
  ["senar", /Grapplesnake Alpha/, null, twSenar([85, 85, 91, 90, 87, 88]), "tw", TW],
  ["senar", /Black Fire/i, null, twSenar([33, 95, 70, 74, 72, 85]), "tw", TW],
  ["senar", /O-Toro Spin/i, null, twSenar([71, 89, 84, 70, 78, 85]), "tw", TW],
  ["senar", /O-Toro(?! ?(Snap|Octa))/i, null, twSenar([55, 94, 75, 92, 79, 82]), "tw", TW],

  // dilengkapi 28 Nov 2026
  ["raket", /Ezone Espresso Brown 2026 98 Tour/, null, twRaket([87, 83, 78, 85, 87, 81]), "tw", TW],
  ["raket", /Vcore 98\+/, null, twRaket([88, 80, 79, 85, 81, 86]), "tw", `${TW} (VCORE 98+ 2026)`],
  ["raket", /Blade 98PRO\/305g 18x20/, null, E([67, 84, 74, 39, 52, 61, 74]), "extreme", `${XD}: Blade 98 18x20 V10 305g`],
  ["raket", /Ezone Espresso Brown 2026 100SL/, null, E([83, 57, 64, 76, 72, 70, 77]), "extreme", `${XD}: Ezone 100L 2025 285g`],
  ["raket", /Ezone Espresso Brown 2026 98L/, null, E([79, 70, 70, 62, 73, 65, 78]), "extreme", `${XD}: Ezone 98 Espresso 2026 305g`],
  ["senar", /Alu Power Vibe/, null, twSenar([66, 66, 82, 75, 73, 88]), "tw", TW],
  // sepatu TW: Kenyamanan=Comfort, Stabilitas=Foot Support/Stability, Ketahanan=Overall Sole Durability, Dinamis=Weight (skala 10 ×10)
  ["sepatu", /Eclipsion 5/, null, obj(SP, [81, 83, 82, 77]), "tw", TW],
  ["sepatu", /GP Challenge 1 /, null, obj(SP, [85, 78, 81, 73]), "tw", TW],
  ["sepatu", /GP Challenge 1\.5/, null, obj(SP, [85, 78, 81, 73]), "tw", `${TW} (model terdekat: GP Challenge 1)`],

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
/** "Raket Tenis Head Extreme PRO Tennis Racket" + "PRO" → "Raket Tenis Head Extreme Tennis Racket" (nama sebelum dipisah). */
const namaTanpaVarian = (nama, varian) => {
  const buang = new Set(tanpaGrip(varian).toLowerCase().split(/\s+/));
  return nama.split(/\s+/).filter((k) => !buang.has(k.toLowerCase())).join(" ");
};
console.assert(namaTanpaVarian("Raket Tenis Solinco Whiteout 98 / 305g XTD Tennis Racket", "98 / 305g XTD") === "Raket Tenis Solinco Whiteout Tennis Racket", "namaTanpaVarian");
/** Kuadrat terkecil (persamaan normal + eliminasi Gauss). A: baris [1, x1..xn], y: target. */
function kuadratTerkecil(A, y) {
  const n = A[0].length;
  const M = Array.from({ length: n }, (_, i) => [...Array.from({ length: n }, (_, j) => A.reduce((s, a) => s + a[i] * a[j], 0)), A.reduce((s, a, k) => s + a[i] * y[k], 0)]);
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
    [M[i], M[p]] = [M[p], M[i]];
    for (let r = 0; r < n; r++) if (r !== i) { const f = M[r][i] / M[i][i]; for (let j = i; j <= n; j++) M[r][j] -= f * M[i][j]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}
{ const b = kuadratTerkecil([[1, 0], [1, 1], [1, 2]], [1, 3, 5]); console.assert(Math.abs(b[0] - 1) < 1e-9 && Math.abs(b[1] - 2) < 1e-9, "kuadratTerkecil"); }

(async () => {
  const out = [], kena = new Set();
  for (const [kat, reNama, reVar, nilai, sumber, catatan] of ATURAN) {
    const ps = await db.product.findMany({ where: { kategori: KAT[kat] }, select: { id: true, nama: true, atribut: true, variants: { select: { warna: true } } } });
    for (const p of ps) {
      // raket hasil pisah (scripts/split-raket.ts): nama sudah berisi varian → cocokkan nama tanpa kata varian, varian = _varianAsal
      const asal = p.atribut?._varianAsal?.[0];
      const namaCocok = asal ? namaTanpaVarian(p.nama, asal) : p.nama;
      if (!reNama.test(p.nama) && !reNama.test(namaCocok)) continue;
      const vs = [...new Set(p.variants.map((v) => tanpaGrip(v.warna)))];
      // varian dipakai hanya untuk raket bervarian (sama dengan import-compare); senar/sepatu = seluruh produk
      const target = asal ? (!reVar || reVar.test(tanpaGrip(asal)) ? [""] : [])
        : kat === "raket" && p.variants.length && vs.some(Boolean) ? (reVar ? vs.filter((v) => reVar.test(v)) : vs) : [""];
      for (const varian of target) {
        const k = `${p.id}|${varian}`;
        if (kena.has(k)) continue;
        kena.add(k);
        const v = Object.values(nilai);
        out.push({ productId: p.id, nama: p.nama, varian, kategori: kat, skor: Math.round(v.reduce((a, b) => a + b, 0) / v.length), nilai, sumber, catatan });
      }
    }
  }
  // Senar tanpa skor tapi punya pengukuran lab TWU (stiffness lb/in, tension loss %, energy return %, spin potential; 51 lbs, ayunan cepat):
  // skor diturunkan lewat regresi linear  nilai = b0 + b1·stiffness + b2·tensionLoss + b3·energyReturn + b4·spin,
  // di-fit ulang tiap jalan dari senar yang punya skor X-Compare DAN data TWU (28 Nov 2026: 37 senar, galat LOO rata-rata 5–7 poin).
  // Hasil dibatasi ke rentang skor senar pelatihan (spin potential > 7.4 di luar rentang data → tidak diekstrapolasi).
  const num = (s) => { const m = String(s ?? "").match(/-?[\d.]+/); return m ? +m[0] : null; };
  const FT = ["Stiffness TWU (lb/in)", "Tension loss TWU", "Energy return TWU", "Spin potential TWU"];
  const ci = (await db.compareItem.findMany({ where: { kategori: "senar", sumber: { has: "twu" } }, select: { productId: true, nilai: true, spek: true, sumber: true, product: { select: { nama: true } } } }))
    .map((c) => ({ ...c, f: [1, ...FT.map((k) => num(c.spek?.[k]))] })).filter((c) => !c.f.includes(null));
  const latih = ci.filter((c) => c.sumber.includes("extreme") && Object.keys(c.nilai || {}).length);
  const koef = Object.fromEntries(SN.map((k) => { const d = latih.filter((c) => c.nilai[k] != null); return [k, { b: kuadratTerkecil(d.map((c) => c.f), d.map((c) => c.nilai[k])), min: Math.min(...d.map((c) => c.nilai[k])), max: Math.max(...d.map((c) => c.nilai[k])) }]; }));
  for (const c of ci) {
    if (c.sumber.includes("extreme") || kena.has(`${c.productId}|`)) continue; // skor X-Compare menang; skor turunan TWU lama dihitung ulang
    kena.add(`${c.productId}|`);
    const nilai = Object.fromEntries(SN.map((k) => [k, Math.round(Math.max(koef[k].min, Math.min(koef[k].max, c.f.reduce((s, x, i) => s + x * koef[k].b[i], 0))))]));
    const v = Object.values(nilai);
    out.push({ productId: c.productId, nama: c.product.nama, varian: "", kategori: "senar", skor: Math.round(v.reduce((a, b) => a + b, 0) / v.length), nilai, sumber: "twu", catatan: "Diturunkan dari pengukuran lab TWU (Tennis Warehouse University), dikalibrasi ke skala X-Compare" });
  }

  fs.writeFileSync("/Users/a1/tirtonic-data/tambahan.json", JSON.stringify(out, null, 1));
  const per = {};
  for (const r of out) per[r.kategori] = (per[r.kategori] || 0) + 1;
  console.log("baris", out.length, per);
  await db.$disconnect();
})();
