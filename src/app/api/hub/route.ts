import { timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { markOrderShipped } from "@/lib/orders";
import { markPreorderShipped } from "@/lib/preorder";
import { detectKategori } from "@/lib/tokopedia";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// API untuk Tirtonichub (Tirtonic Channel): tarik pesanan & produk, isi resi, ubah stok/harga.
// Kunci: header x-hub-secret = POINTS_API_SECRET (rahasia yang sama dengan integrasi Ace Points).

function authed(req: NextRequest): boolean {
  const secret = process.env.POINTS_API_SECRET ?? "";
  const got = req.headers.get("x-hub-secret") ?? "";
  if (!secret || got.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(secret));
}
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const effective = (harga: number, diskon: number | null) => (diskon != null && diskon > 0 && diskon < harga ? diskon : harga);
const latest = (...d: (Date | null)[]) => new Date(Math.max(...d.map((x) => x?.getTime() ?? 0)));

export async function GET(req: NextRequest) {
  if (!authed(req)) return bad("unauthorized", 401);
  const type = req.nextUrl.searchParams.get("type");

  if (type === "orders") {
    const since = new Date(req.nextUrl.searchParams.get("since") ?? Date.now() - 7 * 86_400_000);
    if (Number.isNaN(since.getTime())) return bad("since tidak valid");
    // PENDING (belum bayar) dilewati: dihapus otomatis setelah jendela bayar habis.
    const [orders, pre] = await Promise.all([
      prisma.order.findMany({ where: { updatedAt: { gte: since }, status: { not: "PENDING" } }, include: { items: true }, take: 1000 }),
      prisma.preorderOrder.findMany({
        where: {
          status: { not: "PENDING_DP" },
          OR: [{ createdAt: { gte: since } }, { dpPaidAt: { gte: since } }, { readyAt: { gte: since } }, { lunasAt: { gte: since } }, { arrivedAt: { gte: since } }, { shippedAt: { gte: since } }],
        },
        take: 1000,
      }),
    ]);
    const addr = (o: { alamat: string; kota: string; provinsi: string; kodePos: string | null }) => [o.alamat, o.kota, o.provinsi, o.kodePos].filter(Boolean).join(", ");
    return NextResponse.json({
      orders: [
        ...orders.map((o) => ({
          sn: o.invoice,
          kind: "order",
          status: o.status,
          buyer: o.nama,
          phone: o.telepon,
          address: addr(o),
          courier: o.kurir,
          resi: o.resi,
          note: o.catatan,
          payment: o.metodeBayar,
          total: o.total,
          items: o.items.map((i) => ({ name: i.varian ? `${i.nama} - ${i.varian}` : i.nama, qty: i.qty, price: i.harga, image: i.gambar })),
          createdAt: o.createdAt,
          updatedAt: o.updatedAt,
        })),
        ...pre.map((o) => ({
          sn: o.invoice,
          kind: "preorder",
          status: o.status,
          buyer: o.nama,
          phone: o.telepon,
          address: addr(o),
          courier: o.kurir,
          resi: o.resi,
          note: o.catatan,
          payment: `Pre-order · DP ${o.dp}`,
          total: o.total,
          items: [{ name: o.varian ? `${o.productNama} - ${o.varian}` : o.productNama, qty: o.qty, price: o.harga, image: o.gambar }],
          createdAt: o.createdAt,
          updatedAt: latest(o.createdAt, o.dpPaidAt, o.readyAt, o.lunasAt, o.arrivedAt, o.shippedAt),
        })),
      ],
    });
  }

  if (type === "products") {
    const products = await prisma.product.findMany({ include: { variants: { orderBy: { urutan: "asc" } } }, orderBy: { nama: "asc" } });
    return NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        ref: p.sourceRef, // asal impor (mis. "TOKOPEDIA:<id>"), null = dibuat di web
        name: p.nama,
        brand: p.brand,
        category: p.kategori,
        status: p.status,
        image: p.gambar[0] ?? null,
        price: effective(p.harga, p.hargaDiskon),
        stock: p.stok, // null = tak terbatas
        variants: p.variants.map((v) => ({
          id: v.id,
          label: [v.warna, v.ukuran].filter(Boolean).join(" / "),
          price: effective(v.harga, v.hargaDiskon),
          stock: v.stok,
          image: v.gambar,
        })),
      })),
    });
  }
  return bad("type harus orders atau products");
}

export async function POST(req: NextRequest) {
  if (!authed(req)) return bad("unauthorized", 401);
  let body: { action?: string; sn?: string; resi?: string; kurir?: string; productId?: string; variantId?: string; stock?: number; price?: number; name?: string; product?: ImportProduct };
  try {
    body = await req.json();
  } catch {
    return bad("body bukan JSON");
  }

  if (body.action === "ship") {
    const resi = body.resi?.trim() ?? "";
    if (!body.sn || !resi) return bad("sn & resi wajib");
    const order = await prisma.order.findUnique({ where: { invoice: body.sn }, select: { id: true, status: true } });
    if (order) {
      if (order.status !== "PAID" && order.status !== "SHIPPED") return bad("Pesanan belum dibayar / sudah selesai.");
      await markOrderShipped(order.id, resi, body.kurir?.trim() || undefined);
      return NextResponse.json({ ok: true });
    }
    const pre = await prisma.preorderOrder.findUnique({ where: { invoice: body.sn }, select: { id: true } });
    if (!pre) return bad("Pesanan tidak ditemukan.", 404);
    const r = await markPreorderShipped(pre.id, resi, body.kurir);
    return r.ok ? NextResponse.json({ ok: true }) : bad(r.error ?? "Gagal.");
  }

  if (body.action === "update") {
    const stock = body.stock == null ? undefined : Math.max(0, Math.round(body.stock));
    const price = body.price == null ? undefined : Math.round(body.price);
    if (price != null && price <= 0) return bad("Harga harus lebih dari 0.");
    // Ganti nama produk (dari Produk Master Tirtonichub).
    const name = body.name?.replace(/\s+/g, " ").trim();
    if (body.name != null) {
      if (!name || name.length < 3 || name.length > 255) return bad("Nama 3–255 huruf.");
      const p = await prisma.product.findUnique({ where: { id: body.productId ?? "" }, select: { id: true } });
      if (!p) return bad("Produk tidak ditemukan.", 404);
      await prisma.product.update({ where: { id: p.id }, data: { nama: name } });
      if (stock == null && price == null) return NextResponse.json({ ok: true });
    }
    // Harga yang tampil = harga diskon bila ada → ubah harga diskon; kalau tidak, harga normal.
    if (body.variantId) {
      const v = await prisma.productVariant.findUnique({ where: { id: body.variantId } });
      if (!v || v.productId !== body.productId) return bad("Varian tidak ditemukan.", 404);
      const disc = v.hargaDiskon != null && v.hargaDiskon > 0 && v.hargaDiskon < v.harga;
      await prisma.productVariant.update({
        where: { id: v.id },
        data: { ...(stock != null ? { stok: stock } : {}), ...(price != null ? (disc && price < v.harga ? { hargaDiskon: price } : { harga: price, hargaDiskon: null }) : {}) },
      });
    } else {
      const p = await prisma.product.findUnique({ where: { id: body.productId ?? "" } });
      if (!p) return bad("Produk tidak ditemukan.", 404);
      const disc = p.hargaDiskon != null && p.hargaDiskon > 0 && p.hargaDiskon < p.harga;
      await prisma.product.update({
        where: { id: p.id },
        data: { ...(stock != null ? { stok: stock } : {}), ...(price != null ? (disc && price < p.harga ? { hargaDiskon: price } : { harga: price, hargaDiskon: null }) : {}) },
      });
    }
    return NextResponse.json({ ok: true });
  }
  if (body.action === "import") {
    if (!body.product) return bad("product wajib");
    const r = await importProduct(body.product);
    return "error" in r ? bad(r.error) : NextResponse.json(r);
  }
  return bad("action harus ship, update, atau import");
}

// --- Impor produk dari Produk Master Tirtonichub (mis. semua produk Tokopedia) ---
type ImportProduct = {
  ref: string; // "TOKOPEDIA:<productId>" — kunci upsert
  name: string;
  brand?: string | null;
  category?: string | null; // rantai kategori marketplace (petunjuk kategori)
  description?: string | null; // HTML marketplace
  weightGram?: number | null;
  images?: string[];
  price?: number; // produk tanpa varian
  stock?: number;
  variants?: { warna: string; ukuran?: string; price: number; stock: number; image?: string | null }[];
};

// HTML deskripsi marketplace → teks biasa (baris dipertahankan).
const htmlToText = (h: string) =>
  h
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// Kunci nama: huruf kecil, hanya huruf/angka, spasi tunggal (sama dengan productKey di Tirtonichub).
const nameKey = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function importProduct(p: ImportProduct): Promise<{ ok: true; id: string; created: boolean } | { error: string }> {
  const ref = p.ref?.trim();
  const nama = p.name?.trim();
  if (!ref || !nama) return { error: "ref & name wajib" };
  const variants = (p.variants ?? [])
    .filter((v) => v.warna?.trim() && v.price > 0)
    .map((v, i) => ({ warna: v.warna.trim(), ukuran: (v.ukuran ?? "").trim(), harga: Math.round(v.price), stok: Math.max(0, Math.round(v.stock)), gambar: v.image ?? null, urutan: i }));
  const harga = variants.length ? Math.min(...variants.map((v) => v.harga)) : Math.round(p.price ?? 0);
  if (harga <= 0) return { error: `Harga ${nama} kosong` };
  const stokTotal = variants.length ? variants.reduce((n, v) => n + v.stok, 0) : Math.max(0, Math.round(p.stock ?? 0));
  const kat = detectKategori(`${nama} ${p.category ?? ""}`);

  const data = {
    nama,
    brand: p.brand?.trim() || null,
    kategori: kat,
    harga,
    berat: p.weightGram && p.weightGram > 0 ? Math.round(p.weightGram) : 500,
    deskripsi: p.description ? htmlToText(p.description) || null : null,
    // ponytail: foto di-hotlink dari CDN marketplace (tak di-upload ulang → hemat egress Supabase).
    // Kalau CDN mulai menolak/kedaluwarsa, re-host via uploadFromUrl.
    gambar: (p.images ?? []).filter(Boolean).slice(0, 10),
    status: stokTotal > 0 ? ("READY" as const) : ("SOLD" as const),
    stok: variants.length ? null : stokTotal,
  };

  let existing = await prisma.product.findUnique({ where: { sourceRef: ref }, include: { variants: true } });
  if (!existing) {
    // Produk web yang sudah ada (dibuat manual) dengan nama sama → ditimpa dengan data Tokopedia
    // & ditandai ref ini (export berikutnya langsung update, tak bikin dobel).
    const manual = await prisma.product.findMany({ where: { sourceRef: null }, select: { id: true, nama: true } });
    const dup = manual.find((m) => nameKey(m.nama) === nameKey(nama));
    if (dup) existing = await prisma.product.update({ where: { id: dup.id }, data: { sourceRef: ref }, include: { variants: true } });
  }
  if (!existing) {
    const created = await prisma.product.create({ data: { ...data, sourceRef: ref, variants: { create: variants } } });
    return { ok: true, id: created.id, created: true };
  }

  // Update: varian dicocokkan per warna+ukuran (id lama tetap → keranjang/pesanan aman).
  // Harga diskon manual di web dibiarkan; harga normal & stok ikut marketplace.
  const key = (w: string, u: string) => `${w.toLowerCase()}|${u.toLowerCase()}`;
  const old = new Map(existing.variants.map((v) => [key(v.warna, v.ukuran), v]));
  const keep = new Set<string>();
  await prisma.$transaction([
    prisma.product.update({ where: { id: existing.id }, data }),
    ...variants.map((v) => {
      const o = old.get(key(v.warna, v.ukuran));
      if (o) {
        keep.add(o.id);
        return prisma.productVariant.update({ where: { id: o.id }, data: { harga: v.harga, stok: v.stok, gambar: v.gambar ?? o.gambar, urutan: v.urutan } });
      }
      return prisma.productVariant.create({ data: { ...v, productId: existing.id } });
    }),
  ]);
  const stale = existing.variants.filter((v) => !keep.has(v.id)).map((v) => v.id);
  if (stale.length) await prisma.productVariant.deleteMany({ where: { id: { in: stale } } });
  return { ok: true, id: existing.id, created: false };
}
