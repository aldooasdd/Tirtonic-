import "server-only";
import { prisma } from "@/lib/prisma";
import { isB1G1 } from "@/lib/b1g1";

/** Semua id produk B1G1 (diskon ≥50%). Rasio tak bisa difilter Prisma → ambil kolom ringan lalu saring. */
export async function b1g1ProductIds(): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { hargaDiskon: { not: null }, status: "READY" },
    select: { id: true, harga: true, hargaDiskon: true },
    orderBy: { updatedAt: "desc" },
  });
  return rows.filter((r) => isB1G1(r.harga, r.hargaDiskon)).map((r) => r.id);
}
