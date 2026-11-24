import "server-only";
import type { RailItem } from "@/components/ui/skate-deck-rail-demo";
import { prisma, safeQuery } from "@/lib/prisma";
import { rupiah } from "@/lib/format";
import { productHref } from "@/lib/product-slug";
import { KATEGORI_RAK, railName, railStok } from "@/lib/rail";

/** Acak, tapi raket & sepatu disebar merata supaya tidak berkelompok. */
function acak<T extends { shoe?: boolean }>(items: T[]): T[] {
  const sebar = (xs: T[]) => xs
    .map((x) => ({ x, r: Math.random() })).sort((a, b) => a.r - b.r)
    .map(({ x }, i) => ({ x, pos: (i + 0.25 + Math.random() * 0.5) / xs.length }));
  return [...sebar(items.filter((x) => !x.shoe)), ...sebar(items.filter((x) => x.shoe))].sort((a, b) => a.pos - b.pos).map(({ x }) => x);
}

/** Raket & sepatu di rak yang masih ada stoknya (dipakai beranda & /skate-test). */
export async function railItems(): Promise<RailItem[]> {
  const rows = await safeQuery(() => prisma.racketRail.findMany({ where: { product: { status: "READY" } }, include: { product: { include: { variants: { orderBy: { urutan: "asc" } } } } } }), []);
  // ponytail: diacak tiap render ISR (±2 menit di beranda), bukan tiap pengunjung
  return acak(rows.flatMap(({ id, foto, product: p }) => {
    const stok = railStok(p);
    const ada = stok.opsi.filter((o) => o.stok > 0);
    if (!ada.length) return []; // habis → turun dari rak
    const harga = ada.map((o) => o.harga);
    const min = Math.min(...harga);
    return [{ id, name: railName(p.nama), series: p.brand ?? undefined, tag: `${Math.max(...harga) > min ? "Mulai " : ""}${rupiah(min)}`, image: foto, href: productHref(p), stok, shoe: p.kategori === KATEGORI_RAK.sepatu }];
  }));
}
