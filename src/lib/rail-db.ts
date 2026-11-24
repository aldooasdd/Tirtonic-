import "server-only";
import type { RailItem } from "@/components/ui/skate-deck-rail-demo";
import { prisma, safeQuery } from "@/lib/prisma";
import { rupiah } from "@/lib/format";
import { productHref } from "@/lib/product-slug";
import { KATEGORI_RAK, railName, railStok } from "@/lib/rail";

/** Raket & sepatu di rak yang masih ada stoknya (dipakai beranda & /skate-test). */
export async function railItems(): Promise<RailItem[]> {
  const rows = await safeQuery(() => prisma.racketRail.findMany({ where: { product: { status: "READY" } }, orderBy: [{ urutan: "asc" }, { createdAt: "asc" }], include: { product: { include: { variants: { orderBy: { urutan: "asc" } } } } } }), []);
  return rows.flatMap(({ id, foto, product: p }) => {
    const stok = railStok(p);
    const ada = stok.opsi.filter((o) => o.stok > 0);
    if (!ada.length) return []; // habis → turun dari rak
    const harga = ada.map((o) => o.harga);
    const min = Math.min(...harga);
    return [{ id, name: railName(p.nama), series: p.brand ?? undefined, tag: `${Math.max(...harga) > min ? "Mulai " : ""}${rupiah(min)}`, image: foto, href: productHref(p), stok, shoe: p.kategori === KATEGORI_RAK.sepatu }];
  });
}
