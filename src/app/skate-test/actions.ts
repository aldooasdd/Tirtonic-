"use server";

import { prisma } from "@/lib/prisma";
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
