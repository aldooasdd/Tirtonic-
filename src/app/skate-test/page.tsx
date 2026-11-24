import SkateDeckRailDemo from "@/components/ui/skate-deck-rail-demo";
import { ShopCartProvider } from "@/components/ShopCartProvider";
import { railItems } from "@/lib/rail-db";

export const revalidate = 300; // upload dari dashboard langsung tampil (revalidatePath)

// TEST: 1 foto dipakai berulang, belum tersambung ke produk.
const SEPATU_CONTOH = Array.from({ length: 3 }, (_, i) => ({ id: `sepatu-${i}`, name: "Asics (contoh)", image: "/shoe-test.webp", shoe: true }));

export const metadata = {
  title: "Rak Raket — Tirtonic",
  robots: { index: false, follow: false }, // versi layar penuh; yang utama ada di beranda
};

export default async function SkateTestPage() {
  return (
    <ShopCartProvider>
      <SkateDeckRailDemo items={[...(await railItems()), ...SEPATU_CONTOH]} />
    </ShopCartProvider>
  );
}
