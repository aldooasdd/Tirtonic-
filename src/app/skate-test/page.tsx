import SkateDeckRailDemo from "@/components/ui/skate-deck-rail-demo";
import ShoeSwingRail from "@/components/ui/shoe-swing-rail";
import { ShopCartProvider } from "@/components/ShopCartProvider";
import { railItems } from "@/lib/rail-db";

export const revalidate = 300; // upload dari dashboard langsung tampil (revalidatePath)

// TEST: 1 foto dipakai berulang, belum tersambung ke produk.
const SEPATU_CONTOH = Array.from({ length: 5 }, (_, i) => ({ id: `sepatu-${i}`, name: "Asics (contoh)", image: "/shoe-test.webp" }));

export const metadata = {
  title: "Rak Raket — Tirtonic",
  robots: { index: false, follow: false }, // versi layar penuh; yang utama ada di beranda
};

export default async function SkateTestPage() {
  return (
    <ShopCartProvider>
      <SkateDeckRailDemo items={await railItems()} className="" />
      <ShoeSwingRail items={SEPATU_CONTOH} heading="Pilih sepatumu" caption="Geser untuk lihat sepatu lain, klik untuk detail." />
    </ShopCartProvider>
  );
}
