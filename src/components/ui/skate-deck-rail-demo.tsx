"use client";

import SkateDeckRail from "@/components/ui/skate-deck-rail";
import type { SkateDeck } from "@/components/ui/skate-deck-rail";
import RailBuy from "@/components/RailBuy";
import type { RailStok } from "@/lib/rail";

// TEST: 1 foto raket transparan, dipotong pas di tepi frame supaya kait nyambung.
const RACKET = "/racket-test-cut.webp";
const DECKS: SkateDeck[] = [
  { id: "vcore-a-l", name: "Yonex VCORE α L", series: "VCORE", tag: "Rp 2.450.000", description: "All-round ringan, tenang di tangan, enak buat spin & kontrol.", details: ["100 in²", "260 g", "16×19", "Isometric"], image: RACKET },
  { id: "vcore-100", name: "Yonex VCORE 100", series: "VCORE", tag: "Rp 3.150.000", description: "Spin & power seimbang untuk pemain agresif.", details: ["100 in²", "300 g", "16×19", "Isometric"], image: RACKET },
  { id: "vcore-98", name: "Yonex VCORE 98", series: "VCORE", tag: "Rp 3.350.000", description: "Kontrol presisi, bidang sapu lebih rapat.", details: ["98 in²", "305 g", "16×19", "Isometric"], image: RACKET },
  { id: "vcore-feel", name: "Yonex VCORE Feel", series: "VCORE", tag: "Rp 1.950.000", description: "Ringan dan nyaman untuk pemain berkembang.", details: ["100 in²", "250 g", "16×19", "Isometric"], image: RACKET },
  { id: "vcore-pro", name: "Yonex VCORE Pro", series: "VCORE", tag: "Rp 3.650.000", description: "Flex klasik, rasa kokoh untuk pemukul flat-drive.", details: ["97 in²", "310 g", "16×19", "Flex"], image: RACKET },
];
// TEST: diulang jadi 15 supaya rel lebih panjang dari layar (bisa digeser).
const SKATE_DEMO_DECKS: SkateDeck[] = [0, 1, 2].flatMap((k) => DECKS.map((d) => ({ ...d, id: `${d.id}-${k}` })));

/** Raket asli dari dashboard; href = halaman produk, stok = varian/harga/stok untuk popup. */
export type RailItem = SkateDeck & { href: string; stok: RailStok };

export default function SkateDeckRailDemo({ items, autoplay = true, className = "min-h-svh" }: { items: (RailItem | SkateDeck)[]; autoplay?: boolean; className?: string }) {
  const sepatu = items.some((x) => x.shoe);
  const tas = items.some((x) => x.bag);
  return (
    <div data-skate-demo className={`flex w-full items-center justify-center bg-background text-foreground ${className}`}>
      <SkateDeckRail
        items={items.length ? items : SKATE_DEMO_DECKS}
        heading="Pilih Produk Bonus Merchandise"
        caption={sepatu || tas ? "Geser untuk lihat yang lain, klik untuk beli." : "Geser untuk lihat raket lain, klik untuk beli."}
        interval={3600}
        autoplay={autoplay}
        detailAction={(deck) => "stok" in deck ? <RailBuy awal={(deck as RailItem).stok} href={(deck as RailItem).href} /> : null}
      />
    </div>
  );
}
