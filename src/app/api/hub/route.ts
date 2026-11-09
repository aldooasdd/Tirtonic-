import { timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { markOrderShipped } from "@/lib/orders";
import { markPreorderShipped } from "@/lib/preorder";

export const dynamic = "force-dynamic";

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
  let body: { action?: string; sn?: string; resi?: string; kurir?: string; productId?: string; variantId?: string; stock?: number; price?: number };
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
  return bad("action harus ship atau update");
}
