import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Katalog senar untuk "Pilih senar sendiri": semua senar TWU yang terpetakan ke produk
// (punya foto + harga). Spesifikasi dipakai acuan 51 lbs / swing M (sama seperti riwayat).
export type SenarCard = {
  name: string;
  material: string;
  gauge: number | null;
  price: number | null;
  photo: string | null;
  st: number | null; // kekakuan lb/in
  sp: number | null; // spin potential
  er: number | null; // energy return %
};

export async function GET() {
  const rows = await prisma.twuString.findMany({
    orderBy: { name: "asc" },
    include: {
      measurements: true,
      product: { select: { harga: true, hargaDiskon: true, gambar: true, status: true } },
    },
  });

  const strings: SenarCard[] = rows
    .filter((r) => r.product)
    .map((r) => {
      const ms = r.measurements;
      const ref = ms.find((m) => m.tensionLbs === 51 && m.swing === "M") ?? ms.find((m) => m.tensionLbs === 51) ?? ms[0];
      return {
        name: r.name,
        material: r.material,
        gauge: r.gaugeMm,
        price: r.product!.hargaDiskon ?? r.product!.harga,
        photo: r.product!.gambar[0] ?? null,
        st: ref?.stiffnessLbIn ?? null,
        sp: ref?.spinPotential ?? null,
        er: ref?.energyReturnPct ?? null,
      };
    });

  return NextResponse.json({ strings });
}
