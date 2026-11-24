import SkateDeckRailDemo from "@/components/ui/skate-deck-rail-demo";
import { ShopCartProvider } from "@/components/ShopCartProvider";
import { railItems } from "@/lib/rail-db";

export const revalidate = 300; // upload dari dashboard langsung tampil (revalidatePath)

// TEST: tas contoh, belum tersambung ke produk.
const TAS_CONTOH = { id: "tas-contoh", name: "Tas (contoh)", image: "/bag-test.webp", bag: { ratio: 1458 / 874, x: 0.517, grip: 0.088 } };

export const metadata = {
  title: "Rak Raket — Tirtonic",
  robots: { index: false, follow: false }, // versi layar penuh; yang utama ada di beranda
};

export default async function SkateTestPage() {
  const items = await railItems();
  return (
    <ShopCartProvider>
      <SkateDeckRailDemo items={[...items.slice(0, Math.ceil(items.length / 2)), TAS_CONTOH, ...items.slice(Math.ceil(items.length / 2))]} />
    </ShopCartProvider>
  );
}
