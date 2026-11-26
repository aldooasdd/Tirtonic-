import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { prisma, safeQuery } from "@/lib/prisma";
import { compareItems, isKat } from "@/lib/compare";
import CompareApp from "@/components/compare/CompareApp";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Bandingkan Raket, Senar & Sepatu Tenis — Tirtonic",
  description: "Bandingkan sampai 4 raket, senar, atau sepatu tenis berdasarkan data uji lab: power, kontrol, kenyamanan, spin, dan spesifikasi lengkap.",
};

// Data compare jarang berubah → cache 5 menit per kategori (hemat egress DB).
const dataKat = unstable_cache(
  async (k: string) => {
    if (!isKat(k)) return { items: [], picks: [] };
    const [items, picks] = await Promise.all([
      compareItems({ kategori: k }),
      safeQuery(() => prisma.comparePick.findMany({ where: { kategori: k }, orderBy: { urutan: "asc" } }), []),
    ]);
    return { items, picks: picks.map((p) => ({ id: p.id, judul: p.judul, itemIds: p.itemIds })) };
  },
  ["bandingkan"],
  { revalidate: 300, tags: ["bandingkan"] }
);

export default async function BandingkanPage({ searchParams }: { searchParams: { k?: string; i?: string } }) {
  const kat = isKat(searchParams.k) ? searchParams.k : "raket";
  const { items, picks } = await dataKat(kat);
  return (
    <>
      <CompareApp key={kat} kat={kat} items={items} picks={picks} awal={(searchParams.i || "").split(",").filter(Boolean)} />
      <Footer />
    </>
  );
}

export const dynamic = "force-dynamic";
