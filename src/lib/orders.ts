import "server-only";
import { prisma } from "@/lib/prisma";
import { createDokuPayment } from "@/lib/doku";
import { notifyN8N } from "@/lib/notify";
import { computeCoupon } from "@/lib/coupons";

export type CartLine = { productId: string; variantId?: string | null; qty: number };
export type CheckoutInput = {
  nama: string;
  email: string;
  telepon: string;
  alamat: string;
  kota: string;
  provinsi: string;
  kodePos?: string;
  catatan?: string;
  kupon?: string;
  items: CartLine[];
};

// Baris keranjang final: harga satuan sudah diverifikasi dari DB, plus flag
// wasDiscounted (produk sedang diskon → tak kena kupon). wasDiscounted TIDAK
// ikut disimpan ke OrderItem — hanya dipakai untuk hitung kupon.
export type ResolvedLine = {
  productId: string; variantId: string | null; nama: string; varian: string | null;
  harga: number; qty: number; gambar: string | null; wasDiscounted: boolean;
};

type ProductWithVariants = { id: string; nama: string; berat: number; harga: number; hargaDiskon: number | null; status: string; stok: number | null; gambar: string[]; variants: { id: string; warna: string; ukuran: string; harga: number; hargaDiskon: number | null; stok: number; gambar: string | null }[] };

export type CreateOrderResult =
  | { ok: true; orderId: string; invoice: string; paymentUrl: string | null }
  | { ok: false; error: string };

function genInvoice(): string {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TIRT-${ymd}-${rand}`;
}

const effHarga = (harga: number, hargaDiskon: number | null) =>
  hargaDiskon != null && hargaDiskon < harga ? hargaDiskon : harga;

const wasDiscounted = (harga: number, hargaDiskon: number | null) => hargaDiskon != null && hargaDiskon < harga;

/** Verifikasi tiap item keranjang dari DB → baris final (harga, varian, stok).
 *  Dipakai createOrder dan preview kupon di checkout. */
export async function resolveLines(items: CartLine[]): Promise<{ ok: true; lines: ResolvedLine[] } | { ok: false; error: string }> {
  if (!items?.length) return { ok: false, error: "Keranjang kosong." };

  const products = (await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    include: { variants: true },
  })) as unknown as ProductWithVariants[];

  const lines: ResolvedLine[] = [];
  for (const it of items) {
    const qty = Math.max(1, Math.floor(it.qty || 1));
    const p = products.find((x) => x.id === it.productId);
    if (!p) return { ok: false, error: "Ada produk yang sudah tidak tersedia." };

    if (p.variants.length > 0) {
      if (!it.variantId) return { ok: false, error: `Pilih varian untuk ${p.nama}.` };
      const v = p.variants.find((x) => x.id === it.variantId);
      if (!v) return { ok: false, error: `Varian ${p.nama} tidak ditemukan.` };
      if (v.stok < qty) return { ok: false, error: `Stok ${p.nama} (${v.warna}${v.ukuran ? " / " + v.ukuran : ""}) tinggal ${v.stok}.` };
      lines.push({
        productId: p.id, variantId: v.id, nama: p.nama,
        varian: `${v.warna}${v.ukuran ? " / " + v.ukuran : ""}`,
        harga: effHarga(v.harga, v.hargaDiskon), qty,
        gambar: v.gambar ?? p.gambar[0] ?? null,
        wasDiscounted: wasDiscounted(v.harga, v.hargaDiskon),
      });
    } else {
      if (p.status === "SOLD" || (p.stok != null && p.stok <= 0)) return { ok: false, error: `${p.nama} sedang habis.` };
      if (p.stok != null && p.stok < qty) return { ok: false, error: `Stok ${p.nama} tinggal ${p.stok}.` };
      lines.push({
        productId: p.id, variantId: null, nama: p.nama, varian: null,
        harga: effHarga(p.harga, p.hargaDiskon), qty,
        gambar: p.gambar[0] ?? null,
        wasDiscounted: wasDiscounted(p.harga, p.hargaDiskon),
      });
    }
  }
  return { ok: true, lines };
}

/** Buat order dari keranjang. Harga/varian/stok SELALU diverifikasi ulang dari DB
 *  (harga dari client tidak dipercaya). Stok dipotong nanti saat LUNAS, bukan di sini. */
export async function createOrder(input: CheckoutInput): Promise<CreateOrderResult> {
  const nama = input.nama?.trim();
  const email = input.email?.trim();
  const telepon = input.telepon?.trim();
  const alamat = input.alamat?.trim();
  const kota = input.kota?.trim();
  const provinsi = input.provinsi?.trim();
  if (!nama || !email || !telepon || !alamat || !kota || !provinsi)
    return { ok: false, error: "Lengkapi data pengiriman dulu." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Email tidak valid." };

  const resolved = await resolveLines(input.items);
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const lines = resolved.lines;

  const subtotal = lines.reduce((s, l) => s + l.harga * l.qty, 0);

  // Kupon (kalau ada): divalidasi ulang di server — kode dari client tak dipercaya.
  let diskon = 0;
  let kupon: string | null = null;
  if (input.kupon?.trim()) {
    const cr = await computeCoupon(input.kupon, lines.map((l) => ({ productId: l.productId, harga: l.harga, qty: l.qty, wasDiscounted: l.wasDiscounted })));
    if (!cr.ok) return { ok: false, error: cr.error };
    diskon = cr.diskon;
    kupon = cr.code;
  }

  // Gratis ongkir se-Indonesia.
  const ongkir = 0;
  const kurir = "Gratis Ongkir";
  const total = Math.max(0, subtotal - diskon + ongkir);

  const order = await prisma.order.create({
    data: {
      invoice: genInvoice(),
      nama,
      email,
      telepon,
      alamat,
      kota,
      provinsi,
      kodePos: input.kodePos?.trim() || null,
      catatan: input.catatan?.trim() || null,
      kurir,
      ongkir,
      subtotal,
      diskon,
      kupon,
      total,
      items: { create: lines.map(({ wasDiscounted: _w, ...l }) => l) },
    },
  });

  // Kalau DOKU sudah dikonfigurasi → dapatkan URL halaman bayar. Kalau belum → null
  // (order tetap PENDING, bisa dikonfirmasi manual oleh admin).
  const paymentUrl = await createDokuPayment({
    id: order.id,
    invoice: order.invoice,
    total: order.total,
    nama: order.nama,
    email: order.email,
    telepon: order.telepon,
  });

  return { ok: true, orderId: order.id, invoice: order.invoice, paymentUrl };
}

/** Transisi ke LUNAS: potong stok varian + kirim event ke n8n. Idempoten (aman
 *  dipanggil berulang oleh webhook DOKU). */
export async function markOrderPaid(orderId: string, info?: { metodeBayar?: string; paymentRef?: string }): Promise<boolean> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return false;
  if (order.status !== "PENDING") return true; // sudah diproses, jangan dobel

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: "PAID", paidAt: new Date(), metodeBayar: info?.metodeBayar ?? order.metodeBayar, paymentRef: info?.paymentRef ?? order.paymentRef },
    }),
    // ponytail: potong stok — varian pakai stok per-varian, non-varian pakai Product.stok.
    // Produk non-varian tanpa batas stok (stok null) → decrement null tetap null, aman.
    // Race antar-pesanan bisa bikin minus — tambah lock/stok reservasi kalau volume tinggi.
    ...order.items
      .filter((i) => i.variantId)
      .map((i) => prisma.productVariant.update({ where: { id: i.variantId! }, data: { stok: { decrement: i.qty } } })),
    ...order.items
      .filter((i) => !i.variantId && i.productId)
      .map((i) => prisma.product.update({ where: { id: i.productId! }, data: { stok: { decrement: i.qty } } })),
  ]);

  const fresh = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (fresh) await notifyN8N("paid", fresh);
  return true;
}

/** Isi nomor resi → status DIKIRIM → kirim event ke n8n (WA resi ke customer). */
export async function markOrderShipped(orderId: string, resi: string, kurir?: string): Promise<boolean> {
  const r = resi.trim();
  if (!r) return false;
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status: "SHIPPED", resi: r, shippedAt: new Date(), ...(kurir ? { kurir } : {}) },
    include: { items: true },
  });
  await notifyN8N("shipped", order);
  return true;
}

export async function cancelOrder(orderId: string): Promise<boolean> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status === "SHIPPED") return false;
  await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
  return true;
}
