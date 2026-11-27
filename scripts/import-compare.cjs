// Impor data /bandingkan ke tabel CompareItem dari file di /Users/a1/tirtonic-data.
// Pakai: NODE_PATH=node_modules node --env-file=.env scripts/import-compare.cjs [folder-data]
// Sumber: Extreme Tennis X-Compare (skor 0-100), TWU (lab senar, dari tabel TwuString), tambahan.json (lihat build-tambahan.cjs),
// Tennis Warehouse (spek raket), RunRepeat (lab sepatu). Baris status CEK dilewati.
// Aman diulang: upsert per (productId, varian); item yang tidak ada lagi di sumber dihapus.
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
const DIR = process.argv[2] || "/Users/a1/tirtonic-data";
const baca = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));

const NILAI = {
  raket: { power: "Power", control: "Kontrol", comfort: "Kenyamanan", spin: "Spin", forgiveness: "Toleransi", maneuverability: "Manuver", stability: "Stabilitas" },
  senar: { Power: "Power", Control: "Kontrol", Comfort: "Kenyamanan", Spin: "Spin", "Tension maintenance": "Tahan tension", Durability: "Ketahanan" },
  sepatu: { Comfort: "Kenyamanan", Stability: "Stabilitas", Durability: "Ketahanan", Dynamism: "Dinamis" },
};
const SPEK = {
  extremeRaket: { "Unstrung weight": "Berat tanpa senar", Balance: "Balance", "Head Size": "Head size", "String pattern": "Pola senar", Lenght: "Panjang", "Beam Width": "Lebar frame", "Frame stiffness": "Kekakuan (RA)", Swingweight: "Swingweight", Twistweight: "Twistweight", "Plow-through": "Plow-through", "Level of play": "Level pemain", Strengths: "Keunggulan" },
  tw: { "Head Size": "Head size", Length: "Panjang", "Strung Weight": "Berat dengan senar", Balance: "Balance", Swingweight: "Swingweight dengan senar", Stiffness: "Kekakuan (RA)", "Beam Width": "Lebar frame", Composition: "Bahan", "Power Level": "Power level", "Stroke Style": "Gaya pukulan", "Swing Speed": "Kecepatan ayunan", "String Pattern": "Pola senar", "String Tension": "Tension disarankan" },
  extremeSenar: { "spek:Type": "Tipe", "spek:Compositions": "Bahan", "spek:String stiffness": "Kekakuan", "spek:Recommended stringing tension": "Tension disarankan", "spek:Strengths": "Keunggulan", "spek:Strength": "Keunggulan", "spek:Effective lifespan": "Umur pakai" },
  extremeSepatu: { "spek:Main Benefit": "Keunggulan", "spek:Models": "Lapangan", "spek:Playing Style": "Gaya main", "spek:Type of Cushioning": "Cushioning", "spek:Type of Fit (Width)": "Lebar kaki", "spek:Lateral Stability": "Stabilitas lateral", "spek:Weight 42.5 (US 9)": "Berat (EU 42.5)", "spek:Weight 39.5 (US 8)": "Berat (EU 39.5)", "spek:Drop": "Drop" },
  runrepeat: { skor_runrepeat: "Skor RunRepeat", Weight: "Berat (lab)", Drop: "Drop", "Heel stack": "Tinggi tumit", "Forefoot stack": "Tinggi depan", "Midsole softness": "Kelembutan midsole", "Width / Fit": "Lebar", "Toebox width": "Lebar toebox", "Forefoot traction": "Grip", "Flexibility / Stiffness": "Kekakuan sol", "Energy return forefoot": "Energy return", "Shock absorption heel": "Redaman tumit", "Outsole durability": "Aus outsole (uji abrasi)", "Breathability (old method)": "Sirkulasi udara (1-5)", "Removable insole": "Insole bisa dilepas" },
};

const items = new Map(); // key productId|varian -> item
function item(productId, varian, kategori) {
  const k = `${productId}|${varian}`;
  if (!items.has(k)) items.set(k, { productId, varian, kategori, skor: null, nilai: {}, spek: {}, sumber: [] });
  return items.get(k);
}
function isiSpek(it, row, map, src) {
  for (const [from, to] of Object.entries(map)) {
    let v = row[from];
    if (v == null || v === "" || it.spek[to] != null) continue; // sumber pertama menang
    if (to === "Pola senar") v = String(v).replace(/(\d+) Mains \/ (\d+) Crosses/, "$1x$2");
    it.spek[to] = String(v);
  }
  if (!it.sumber.includes(src)) it.sumber.push(src);
}
// sama dengan tanpaGrip di src/lib/compare-shared.ts
const tanpaGrip = (w) => w.replace(/\s*(-\s*G\d?|\(G?\d?\)|\bG\d)\s*$/i, "").replace(/\s*\(\)\s*$/, "").trim();
const ok = (r) => (r.status ? r.status === "OK" : r.selisih >= 0 && String(r.tahunBeda) !== "True");

(async () => {
  const prods = await db.product.findMany({ select: { id: true, kategori: true, variants: { select: { warna: true, ukuran: true } } } });
  const P = new Map(prods.map((p) => [p.id, p]));
  // varian TW ditulis "warna ukuran" (mis. "100 / 285gr G2") → ambil warna-nya saja
  const keWarna = (pid, v) => tanpaGrip(P.get(pid)?.variants.find((x) => `${x.warna} ${x.ukuran}`.trim() === v || x.warna === v)?.warna ?? "");

  for (const r of baca("extreme-tennis-raket.json")) {
    if (!P.has(r.productId) || !ok(r)) continue;
    const it = item(r.productId, P.get(r.productId).variants.length ? tanpaGrip(r.model) : "", "raket");
    it.skor = +r.skor;
    for (const [k, lbl] of Object.entries(NILAI.raket)) if (r[k] != null) it.nilai[lbl] = +r[k];
    isiSpek(it, r, SPEK.extremeRaket, "extreme");
  }
  for (const r of baca("tw-raket.json")) {
    if (!P.has(r.productId)) continue;
    isiSpek(item(r.productId, keWarna(r.productId, r.varian), "raket"), r, SPEK.tw, "tw");
  }
  for (const [f, kat, map] of [["extreme-tennis-senar.json", "senar", SPEK.extremeSenar], ["extreme-tennis-sepatu.json", "sepatu", SPEK.extremeSepatu]]) {
    for (const r of baca(f)) {
      if (!P.has(r.productId) || !ok(r)) continue;
      const it = item(r.productId, "", kat);
      it.skor = +r.skor;
      for (const [k, lbl] of Object.entries(NILAI[kat])) if (r[k] != null) it.nilai[lbl] = +r[k];
      isiSpek(it, r, map, "extreme");
    }
  }
  for (const r of baca("runrepeat-sepatu-produk.json")) {
    if (P.has(r.productId)) isiSpek(item(r.productId, "", "sepatu"), r, SPEK.runrepeat, "runrepeat");
  }
  // TWU: pengukuran referensi 51 lbs, ayunan cepat. Satu produk bisa punya beberapa gauge → ambil yang pertama.
  const twu = await db.twuString.findMany({
    where: { productId: { not: null }, dataCoverage: { not: "tanpa_data" } },
    include: { measurements: { where: { tensionLbs: 51, swing: "F" } } },
    orderBy: { name: "asc" },
  });
  for (const t of twu) {
    const m = t.measurements[0];
    if (!m || !P.has(t.productId)) continue;
    isiSpek(item(t.productId, "", "senar"), {
      "Bahan": t.material, "Gauge": t.gaugeMm ? `${t.gaugeMm} mm` : null,
      "Stiffness (lb/in)": m.stiffnessLbIn, "Tension loss": m.tensionLossPct != null ? `${m.tensionLossPct}%` : null,
      "Energy return": m.energyReturnPct != null ? `${m.energyReturnPct}%` : null, "Spin potential": m.spinPotential,
      "Model TWU": t.name,
    }, { Bahan: "Bahan", Gauge: "Gauge", "Stiffness (lb/in)": "Stiffness TWU (lb/in)", "Tension loss": "Tension loss TWU", "Energy return": "Energy return TWU", "Spin potential": "Spin potential TWU", "Model TWU": "Model yang diuji TWU" }, "twu");
  }

  // Tambahan (scripts/build-tambahan.cjs): skor untuk produk yang belum punya skor dari sumber di atas.
  if (fs.existsSync(path.join(DIR, "tambahan.json"))) {
    for (const r of baca("tambahan.json")) {
      if (!P.has(r.productId)) continue;
      const it = item(r.productId, r.varian, r.kategori);
      if (Object.keys(it.nilai).length) continue; // data dari sumber utama menang
      it.nilai = r.nilai;
      it.skor = r.skor;
      it.spek["Sumber skor"] = r.catatan;
      if (!it.sumber.includes(r.sumber)) it.sumber.push(r.sumber);
    }
  }

  // data "manual" (diisi dari form Tirtonichub, src/lib/hub-produk.ts) tidak ditimpa dan tidak dihapus
  const manual = new Set((await db.compareItem.findMany({ where: { sumber: { has: "manual" } }, select: { productId: true, varian: true } })).map((x) => `${x.productId}|${x.varian}`));
  const all = [...items.values()].filter((i) => !manual.has(`${i.productId}|${i.varian}`));
  for (const it of all) {
    const data = { kategori: it.kategori, skor: it.skor, nilai: it.nilai, spek: it.spek, sumber: it.sumber };
    await db.compareItem.upsert({ where: { productId_varian: { productId: it.productId, varian: it.varian } }, create: { productId: it.productId, varian: it.varian, ...data }, update: data });
  }
  const keep = new Set([...all.map((i) => `${i.productId}|${i.varian}`), ...manual]);
  const lama = await db.compareItem.findMany({ select: { id: true, productId: true, varian: true } });
  const buang = lama.filter((x) => !keep.has(`${x.productId}|${x.varian}`)).map((x) => x.id);
  if (buang.length) await db.compareItem.deleteMany({ where: { id: { in: buang } } });
  const per = {};
  for (const it of all) per[it.kategori] = (per[it.kategori] || 0) + 1;
  console.log("item", all.length, per, "dengan skor", all.filter((i) => i.skor != null).length, "dihapus", buang.length);
  await db.$disconnect();
})();
