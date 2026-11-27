// Produk baru manual dari Tirtonichub (form "Produk web baru") → tirtonic.com lewat /api/hub.
// GET type=form  → daftar kategori + field filter shop (opsi diambil dari data yang sudah ada).
// POST action=upload → simpan 1 foto (base64) ke storage, balas URL.
// POST action=simpan → buat / perbarui produk (upsert per ref "HUB:<id>").
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { uniqueProductSlug } from "@/lib/product-slug";
import { KATS, KRITERIA, atribut, facets } from "@/lib/shop-kat";
import { rowsKategori } from "@/lib/shop-kat-db";

/** Spek teks (Tirtoniclab) yang dibaca filter shop per kategori lab. */
export const SPEK_FORM: Record<string, { label: string; contoh: string }[]> = {
  raket: [
    { label: "Berat tanpa senar", contoh: "300g" },
    { label: "Head size", contoh: "100 in²" },
    { label: "Balance", contoh: "32cm" },
    { label: "Kekakuan (RA)", contoh: "65" },
    { label: "Swingweight", contoh: "320" },
    { label: "Twistweight", contoh: "14.5" },
  ],
};

const SKIP = new Set(["brand", "ukuran", "berat", "head", "grip"]); // brand/ukuran punya kolom sendiri; berat/head raket dari spek; grip dari varian

export async function formProduk() {
  const out = [];
  for (const k of KATS) {
    const rows = await rowsKategori(k.db).catch(() => []);
    const multi = facets(k).filter((f) => f.type === "multi" && !SKIP.has(f.key));
    out.push({
      db: k.db,
      label: k.label,
      lab: k.lab ?? null,
      atribut: multi.map((f) => {
        const ada = new Set<string>(f.type === "multi" ? f.urut ?? [] : []);
        for (const r of rows) for (const v of atribut(k, r)[f.key] ?? []) if (v) ada.add(v);
        return { key: f.key, label: f.label, opsi: [...ada] };
      }),
      spek: k.lab ? SPEK_FORM[k.lab] ?? [] : [],
      kriteria: k.lab ? KRITERIA[k.lab] : [],
    });
  }
  return out;
}

export async function uploadFoto(nama: string, tipe: string, base64: string) {
  if (!/^image\/(jpeg|png|webp)$/.test(tipe)) throw new Error("Foto harus JPG, PNG, atau WEBP.");
  const buf = Buffer.from(base64, "base64");
  if (!buf.length || buf.length > 3_000_000) throw new Error("Foto kosong atau lebih dari 3 MB.");
  return uploadFile(new File([buf], nama || "foto.jpg", { type: tipe }), "products");
}

export type SimpanProduk = {
  ref: string; // "HUB:<id>" (form Produk web baru) atau "TOKOPEDIA:<id>" (form Tambah Produk, tujuan tirtonic.com); kunci upsert
  nama: string;
  kategori: string; // Product.kategori, mis. "Raket Tenis"
  brand?: string | null;
  harga: number;
  hargaDiskon?: number | null;
  stok?: number | null; // produk tanpa varian; null = tak terbatas
  berat?: number | null; // gram, untuk ongkir
  deskripsi?: string | null;
  gambar: string[];
  ukuran?: string[]; // ukuran sepatu
  varianLabel?: string | null;
  variants?: { warna: string; ukuran?: string; harga: number; hargaDiskon?: number | null; stok: number; gambar?: string | null }[];
  atribut?: Record<string, string[]>;
  spek?: Record<string, string>;
  nilai?: Record<string, number>; // skor lab 0-100 per kriteria
  skor?: number | null;
};

const bersih = (s?: string | null) => s?.replace(/\s+/g, " ").trim() || null;

export async function simpanProduk(p: SimpanProduk): Promise<{ id: string; slug: string | null; created: boolean } | { error: string }> {
  const ref = p.ref?.trim();
  const nama = bersih(p.nama);
  const kat = KATS.find((k) => k.db === p.kategori);
  if (!/^(HUB|TOKOPEDIA):\S+$/.test(ref ?? "")) return { error: "ref harus HUB:<id> atau TOKOPEDIA:<id>" };
  if (!nama || nama.length < 3) return { error: "Nama minimal 3 huruf." };
  if (!kat) return { error: "Kategori tidak dikenal." };
  const variants = (p.variants ?? [])
    .filter((v) => bersih(v.warna))
    .map((v, i) => ({ warna: bersih(v.warna)!, ukuran: bersih(v.ukuran) ?? "", harga: Math.round(v.harga), hargaDiskon: v.hargaDiskon && v.hargaDiskon < v.harga ? Math.round(v.hargaDiskon) : null, stok: Math.max(0, Math.round(v.stok || 0)), gambar: v.gambar || null, urutan: i }));
  if (variants.some((v) => !(v.harga > 0))) return { error: "Harga tiap varian wajib diisi." };
  const harga = variants.length ? Math.min(...variants.map((v) => v.harga)) : Math.round(p.harga);
  if (!(harga > 0)) return { error: "Harga wajib diisi." };
  if (!p.gambar?.length) return { error: "Minimal 1 foto." };
  const stok = variants.length ? null : p.stok == null ? null : Math.max(0, Math.round(p.stok));
  const ada = variants.length ? variants.some((v) => v.stok > 0) : stok == null || stok > 0;
  const atr = Object.fromEntries(Object.entries(p.atribut ?? {}).map(([k, v]) => [k, (v ?? []).map((x) => x.trim()).filter(Boolean)]).filter(([, v]) => v.length));

  const data = {
    nama,
    kategori: kat.db,
    brand: bersih(p.brand),
    harga,
    hargaDiskon: !variants.length && p.hargaDiskon && p.hargaDiskon < harga ? Math.round(p.hargaDiskon) : null,
    stok,
    berat: p.berat && p.berat > 0 ? Math.round(p.berat) : kat.db === "Sepatu Tenis" ? 2000 : 500,
    deskripsi: p.deskripsi?.trim() || null,
    gambar: p.gambar.slice(0, 10),
    ukuran: (p.ukuran ?? []).map((u) => u.trim()).filter(Boolean),
    varianLabel: variants.length ? bersih(p.varianLabel) ?? "Varian" : null,
    atribut: atr,
    status: ada ? ("READY" as const) : ("SOLD" as const),
  };

  const lama = await prisma.product.findUnique({ where: { sourceRef: ref }, include: { variants: true } });
  let id: string, slug: string | null, created = false;
  if (!lama) {
    const s = await uniqueProductSlug(nama, async (x) => !!(await prisma.product.findUnique({ where: { slug: x }, select: { id: true } })));
    const c = await prisma.product.create({ data: { ...data, slug: s, sourceRef: ref, variants: { create: variants } } });
    ({ id, slug } = c);
    created = true;
  } else {
    // varian dicocokkan per warna+ukuran supaya id lama (keranjang/pesanan) tetap
    const key = (w: string, u: string) => `${w.toLowerCase()}|${u.toLowerCase()}`;
    const old = new Map(lama.variants.map((v) => [key(v.warna, v.ukuran), v]));
    const keep = new Set<string>();
    await prisma.$transaction([
      prisma.product.update({ where: { id: lama.id }, data }),
      ...variants.map((v) => {
        const o = old.get(key(v.warna, v.ukuran));
        if (o) { keep.add(o.id); return prisma.productVariant.update({ where: { id: o.id }, data: v }); }
        return prisma.productVariant.create({ data: { ...v, productId: lama.id } });
      }),
    ]);
    const stale = lama.variants.filter((v) => !keep.has(v.id)).map((v) => v.id);
    if (stale.length) await prisma.productVariant.deleteMany({ where: { id: { in: stale } } });
    ({ id, slug } = lama);
  }

  // spek & skor lab → CompareItem (sumber "manual": tidak dihapus scripts/import-compare.cjs)
  const spek = Object.fromEntries(Object.entries(p.spek ?? {}).map(([k, v]) => [k, v?.trim()]).filter(([, v]) => v));
  const nilai = Object.fromEntries(Object.entries(p.nilai ?? {}).filter(([, v]) => Number.isFinite(v) && v >= 0 && v <= 100).map(([k, v]) => [k, Math.round(v)]));
  if (kat.lab && (Object.keys(spek).length || Object.keys(nilai).length)) {
    const skor = p.skor != null && p.skor >= 0 && p.skor <= 100 ? Math.round(p.skor) : null;
    const isi = { kategori: kat.lab, skor, nilai, spek, sumber: ["manual"] };
    await prisma.compareItem.upsert({ where: { productId_varian: { productId: id, varian: "" } }, create: { productId: id, varian: "", ...isi }, update: isi });
  }

  revalidateTag("products");
  revalidateTag("bandingkan");
  revalidatePath("/");
  revalidatePath("/shop");
  return { id, slug, created };
}

export function demo() {
  console.assert(bersih("  a   b ") === "a b");
  console.assert(SPEK_FORM.raket.some((s) => s.label === "Balance"));
}
