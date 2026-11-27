"use server";

import { prisma, safeQuery } from "@/lib/prisma";
import { b1g1Options } from "@/lib/b1g1-db";
import { railStok, type RailStok } from "@/lib/rail";
import type { B1G1Option } from "@/components/B1G1Popup";

/** Stok & harga terbaru raket di rak (dibaca langsung dari DB). null = sudah tidak dijual di rak. */
export async function liveRail(productId: string): Promise<RailStok | null> {
  const p = await prisma.product.findFirst({
    where: { id: String(productId), racketRail: { isNot: null } },
    include: { variants: { orderBy: { urutan: "asc" } } },
  });
  return p && railStok(p);
}

/** Pasangan Buy 1 Get 1, hanya diambil saat raket B1G1 dibeli. */
export async function railB1G1(): Promise<B1G1Option[]> {
  return b1g1Options();
}

/** Pilihan bonus merchandise yang masih ada stoknya. Kosong = tidak ada bonus. */
export async function railMerch(): Promise<B1G1Option[]> {
  const rows = await safeQuery(() => prisma.merchandise.findMany({ where: { product: { status: "READY" } }, orderBy: { createdAt: "asc" }, include: { product: { include: { variants: { orderBy: { urutan: "asc" } } } } } }), []);
  return rows
    .map(({ product: x }) => ({
      id: x.id, nama: x.nama, gambar: x.gambar[0] ?? null, harga: x.harga, stok: x.stok, bervarian: x.variants.length > 0,
      variants: x.variants.filter((v) => v.stok > 0).map((v) => ({ id: v.id, label: [v.warna, v.ukuran].filter(Boolean).join(" / "), harga: v.harga, stok: v.stok, gambar: v.gambar ?? x.gambar[0] ?? null })),
    }))
    .filter((x) => (x.bervarian ? x.variants.length > 0 : x.stok == null || x.stok > 0))
    .map(({ bervarian: _b, ...x }) => x);
}
