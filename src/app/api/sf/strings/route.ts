import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Katalog senar untuk "Pilih senar sendiri": SEMUA produk senar di shop (kategori
// "String", READY & masih ada stok) — sama seperti yang tampil di halaman Shop.
// Spesifikasi lab TWU (acuan 51 lbs / swing M) ikut ditampilkan kalau senarnya terpetakan.
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
  const products = await prisma.product.findMany({
    where: {
      kategori: "String",
      status: "READY",
      // sembunyikan yang benar-benar habis (logika sama seperti Shop)
      OR: [
        { variants: { some: { stok: { gt: 0 } } } },
        { variants: { none: {} }, stok: { gt: 0 } },
        { variants: { none: {} }, stok: null },
      ],
    },
    orderBy: { nama: "asc" },
    select: {
      nama: true,
      harga: true,
      hargaDiskon: true,
      gambar: true,
      twuStrings: { select: { material: true, gaugeMm: true, measurements: true }, take: 1 },
    },
  });

  const strings: SenarCard[] = products.map((p) => {
    const twu = p.twuStrings[0] ?? null;
    const ms = twu?.measurements ?? [];
    const ref = ms.find((m) => m.tensionLbs === 51 && m.swing === "M") ?? ms.find((m) => m.tensionLbs === 51) ?? ms[0];
    return {
      name: p.nama,
      material: twu?.material ?? "Senar",
      gauge: twu?.gaugeMm ?? null,
      price: p.hargaDiskon ?? p.harga,
      photo: p.gambar[0] ?? null,
      st: ref?.stiffnessLbIn ?? null,
      sp: ref?.spinPotential ?? null,
      er: ref?.energyReturnPct ?? null,
    };
  });

  return NextResponse.json({ strings });
}
