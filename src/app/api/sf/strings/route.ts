import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Katalog senar untuk "Pilih senar sendiri": SEMUA produk senar di shop (kategori
// "String", READY & masih ada stok) — sama seperti yang tampil di halaman Shop.
// Senar bervarian (mis. gauge 16g/17g) ikut dikirim varian-nya (hanya yang ada stok).
// Spesifikasi lab TWU (acuan 51 lbs / swing M) ikut ditampilkan kalau senarnya terpetakan.
export type SenarVariant = { label: string; price: number | null };
export type SenarCard = {
  name: string;
  material: string;
  gauge: number | null;
  price: number | null; // harga termurah (kalau bervarian)
  photo: string | null;
  st: number | null; // kekakuan lb/in
  sp: number | null; // spin potential
  er: number | null; // energy return %
  variants: SenarVariant[];
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
      variants: { select: { warna: true, ukuran: true, harga: true, hargaDiskon: true, stok: true, urutan: true }, orderBy: { urutan: "asc" } },
      twuStrings: { select: { material: true, gaugeMm: true, measurements: true }, take: 1 },
    },
  });

  const strings: SenarCard[] = products.map((p) => {
    const twu = p.twuStrings[0] ?? null;
    const ms = twu?.measurements ?? [];
    const ref = ms.find((m) => m.tensionLbs === 51 && m.swing === "M") ?? ms.find((m) => m.tensionLbs === 51) ?? ms[0];
    const productPrice = p.hargaDiskon ?? p.harga;
    const variants: SenarVariant[] = p.variants
      .filter((v) => v.stok > 0)
      .map((v) => ({ label: [v.warna, v.ukuran].filter(Boolean).join(" ").trim(), price: v.hargaDiskon ?? v.harga }));
    const price = variants.length ? Math.min(...variants.map((v) => v.price ?? productPrice)) : productPrice;
    return {
      name: p.nama,
      material: twu?.material ?? "Senar",
      gauge: twu?.gaugeMm ?? null,
      price,
      photo: p.gambar[0] ?? null,
      st: ref?.stiffnessLbIn ?? null,
      sp: ref?.spinPotential ?? null,
      er: ref?.energyReturnPct ?? null,
      variants,
    };
  });

  return NextResponse.json({ strings });
}
