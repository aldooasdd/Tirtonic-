// Pisah produk raket per varian (mis. "98 / 305g", "100 / 300g") jadi produk sendiri.
// Grip (G0–G5) tetap jadi pilihan varian di dalam produk.
// Varian pertama tetap di produk lama (id, slug, sourceRef Tokopedia, rak tetap), varian lain jadi produk baru.
// Produk baru ditandai atribut._induk = [id produk lama], semua ditandai atribut._varianAsal = [nama varian]
// (dipakai import-compare & build-tambahan & sinkron hub untuk memetakan data lama).
//
// Pakai: npx tsx --env-file=.env --tsconfig tsconfig.json scripts/split-raket.ts          → dry run
//        npx tsx --env-file=.env --tsconfig tsconfig.json scripts/split-raket.ts --apply  → jalankan
import { writeFileSync } from "node:fs";
import { PrismaClient, type Prisma } from "@prisma/client";
import { uniqueProductSlug } from "@/lib/product-slug";

const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const GRIP = /^[GL]\d$/i;
const tanpaGrip = (w: string) => w.replace(/\s*(-\s*G\d?|\(G?\d?\)|\bG\d)\s*$/i, "").replace(/\s*\(\)\s*$/, "").trim();
const gripDari = (w: string) => w.match(/\bG(\d)\s*\)?\s*$/i)?.[1];

/** Sisipkan varian setelah nama model: sebelum "Japan", "Tennis Racket", "Racket", "Limited Edition", dst. */
export function namaVarian(nama: string, varian: string) {
  const m = nama.match(/\s+(?=(Japan|Tennis Rac(?:k|qu)et|Racket Tenn?is|Rac(?:k|qu)et|Raket Tenn?is|Limited Edition|Original|ORIGINAL)\b)/);
  const i = m && m.index! > 12 ? m.index! : nama.length;
  // kata awal varian yang sudah ada di nama tidak diulang: "Dunlop CX 200" + "CX 200 - 98 (305g)" → "… CX 200 98 (305g)"
  const depan = nama.slice(0, i).toLowerCase();
  const rapat = depan.replace(/\s+/g, "");
  const kataNama = new Set(depan.split(/\s+/));
  const sudahAda = (k: string) => k === "-" || k === "/" || kataNama.has(k.toLowerCase()) || (k.length >= 4 && rapat.includes(k.toLowerCase()));
  const kata = varian.split(/\s+/);
  while (kata.length > 1 && sudahAda(kata[0])) kata.shift();
  kata[0] = kata[0].replace(/^-(?=\d)/, "");
  return `${nama.slice(0, i)} ${kata.join(" ")}${nama.slice(i)}`.replace(/\s+/g, " ").trim();
}

/** Varian baru di dalam produk hasil pisah: grip jadi pilihan, kalau tak ada grip pakai nama varian. */
function varianBaru(v: { warna: string; ukuran: string }, grup: string) {
  if (GRIP.test(v.ukuran.trim())) return { warna: v.ukuran.trim().toUpperCase().replace(/^L/, "G"), ukuran: "" };
  const g = gripDari(v.warna);
  if (g) return { warna: `G${g}`, ukuran: v.ukuran };
  return { warna: grup, ukuran: v.ukuran };
}

function demo() {
  console.assert(namaVarian("Raket Tenis Yonex Vcore Japan Tennis Racket", "98 / 305gr") === "Raket Tenis Yonex Vcore 98 / 305gr Japan Tennis Racket");
  console.assert(namaVarian("Raket Tenis Head Speed 2026 Tennis Racket", "MP 300g") === "Raket Tenis Head Speed 2026 MP 300g Tennis Racket");
  console.assert(namaVarian("Raket Tenis Babolat Pure Strike Racket Tennis", "100/300G") === "Raket Tenis Babolat Pure Strike 100/300G Racket Tennis");
  console.assert(namaVarian("Raket Tenis Dunlop CX 200 Limited Edition Tennis Racket", "CX 200 - 98 (305g)") === "Raket Tenis Dunlop CX 200 98 (305g) Limited Edition Tennis Racket");
  console.assert(namaVarian("Raket Tenis Yonex Ezone Alpha Espresso Brown 2026 Tennis Racket", "Alpha L / 260g") === "Raket Tenis Yonex Ezone Alpha Espresso Brown 2026 L / 260g Tennis Racket");
  console.assert(varianBaru({ warna: "98 / 305g - G2", ukuran: "" }, "98 / 305g").warna === "G2");
  console.assert(varianBaru({ warna: "100/276g", ukuran: "G1" }, "100/276g").warna === "G1");
  console.assert(varianBaru({ warna: "MP L", ukuran: "" }, "MP L").warna === "MP L");
  console.assert(tanpaGrip("G2") === "", "grip saja = bukan varian");
}

(async () => {
  demo();
  const ps = await db.product.findMany({
    where: { kategori: "Raket Tenis" },
    include: { variants: { orderBy: { urutan: "asc" } }, compareItems: true },
    orderBy: { nama: "asc" },
  });
  const rencana: { produk: typeof ps[number]; grup: { nama: string; vs: typeof ps[number]["variants"] }[] }[] = [];
  for (const p of ps) {
    const grup: { nama: string; vs: typeof p.variants }[] = [];
    for (const v of p.variants) {
      const k = tanpaGrip(v.warna);
      if (!k) continue;
      const g = grup.find((x) => x.nama.toLowerCase() === k.toLowerCase());
      if (g) g.vs.push(v);
      else grup.push({ nama: k, vs: [v] });
    }
    if (grup.length > 1 && grup.reduce((n, g) => n + g.vs.length, 0) === p.variants.length) rencana.push({ produk: p, grup });
  }

  console.log(`${rencana.length} raket dipisah jadi ${rencana.reduce((n, r) => n + r.grup.length, 0)} produk${APPLY ? "" : " (dry run)"}`);
  for (const { produk, grup } of rencana) {
    console.log(`\n${produk.nama}`);
    for (const [i, g] of grup.entries()) console.log(`  ${i ? "+ baru " : "= lama "} ${namaVarian(produk.nama, g.nama)}  [${g.vs.map((v) => varianBaru(v, g.nama).warna).join(", ")}]`);
  }
  if (!APPLY) return db.$disconnect();

  // backup sebelum mengubah apa pun
  writeFileSync(`split-raket-backup-${Date.now()}.json`, JSON.stringify(rencana.map((r) => r.produk), null, 1));

  for (const { produk: p, grup } of rencana) {
    const atributLama = (p.atribut ?? {}) as Record<string, unknown>;
    for (const [i, g] of grup.entries()) {
      const nama = namaVarian(p.nama, g.nama);
      const grip = g.vs.some((v) => GRIP.test(v.ukuran.trim()) || gripDari(v.warna));
      const hargaD = g.vs.map((v) => v.hargaDiskon).filter((x): x is number => x != null && x > 0);
      const data = {
        nama,
        harga: Math.min(...g.vs.map((v) => v.harga)),
        hargaDiskon: hargaD.length ? Math.min(...hargaD) : null,
        gambar: p.gambar, // foto sama untuk semua pecahan

        varianLabel: grip ? "Grip" : "Varian",
        status: g.vs.some((v) => v.stok > 0) ? ("READY" as const) : ("SOLD" as const),
        atribut: { ...atributLama, _varianAsal: [g.nama], ...(i ? { _induk: [p.id] } : {}) } as Prisma.InputJsonValue,
      };
      await db.$transaction(async (tx) => {
        let pid = p.id;
        if (i === 0) {
          await tx.product.update({ where: { id: p.id }, data });
        } else {
          const slug = await uniqueProductSlug(nama, async (s) => !!(await tx.product.findUnique({ where: { slug: s }, select: { id: true } })));
          const baru = await tx.product.create({
            data: {
              ...data, slug, kategori: p.kategori, brand: p.brand, diskonPersen: p.diskonPersen, eventAktif: p.eventAktif,
              berat: p.berat, deskripsi: p.deskripsi, sizeChart: p.sizeChart, ukuran: p.ukuran,
            },
          });
          pid = baru.id;
        }
        for (const [u, v] of g.vs.entries()) await tx.productVariant.update({ where: { id: v.id }, data: { productId: pid, urutan: u, ...varianBaru(v, g.nama) } });
        // data lab per varian ikut pindah, jadi data seluruh produk (varian "")
        const ci = p.compareItems.find((c) => c.varian.toLowerCase() === g.nama.toLowerCase());
        if (ci) {
          await tx.compareItem.deleteMany({ where: { productId: pid, varian: "", NOT: { id: ci.id } } });
          await tx.compareItem.update({ where: { id: ci.id }, data: { productId: pid, varian: "" } });
        }
      });
      console.log(`${i ? "dibuat " : "diubah "} ${nama}`);
    }
    // data lab varian lama yang tak cocok ke grup mana pun
    await db.compareItem.deleteMany({ where: { productId: p.id, varian: { not: "" } } });
  }
  await db.$disconnect();
})();
