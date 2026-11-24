import SkateDeckRailDemo from "@/components/ui/skate-deck-rail-demo";
import { ShopCartProvider } from "@/components/ShopCartProvider";
import { railItems } from "@/lib/rail-db";

export const revalidate = 300; // upload dari dashboard langsung tampil (revalidatePath)

export const metadata = {
  title: "Rak Raket — Tirtonic",
  robots: { index: false, follow: false }, // versi layar penuh; yang utama ada di beranda
};

export default async function SkateTestPage() {
  return (
    <ShopCartProvider>
      <SkateDeckRailDemo items={await railItems()} />
    </ShopCartProvider>
  );
}
