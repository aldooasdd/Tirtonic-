"use client";

import * as React from "react";
import SkateDeckRail from "@/components/ui/skate-deck-rail";
import type { SkateDeck } from "@/components/ui/skate-deck-rail";

// TEST: pakai 1 foto raket (background belum transparan) buat lihat tampilan rail.
const RACKET = "/racket-test.png";
export const SKATE_DEMO_DECKS: SkateDeck[] = [
  { id: "vcore-a-l", name: "Yonex VCORE α L", series: "VCORE", width: "100 in²", tag: "Rp 2.450.000", description: "All-round ringan, tenang di tangan, enak buat spin & kontrol.", details: ["100 in²", "260 g", "16×19", "Isometric"], image: RACKET },
  { id: "vcore-100", name: "Yonex VCORE 100", series: "VCORE", width: "100 in²", tag: "Rp 3.150.000", description: "Spin & power seimbang untuk pemain agresif.", details: ["100 in²", "300 g", "16×19", "Isometric"], image: RACKET },
  { id: "vcore-98", name: "Yonex VCORE 98", series: "VCORE", width: "98 in²", tag: "Rp 3.350.000", description: "Kontrol presisi, bidang sapu lebih rapat.", details: ["98 in²", "305 g", "16×19", "Isometric"], image: RACKET },
  { id: "vcore-feel", name: "Yonex VCORE Feel", series: "VCORE", width: "100 in²", tag: "Rp 1.950.000", description: "Ringan dan nyaman untuk pemain berkembang.", details: ["100 in²", "250 g", "16×19", "Isometric"], image: RACKET },
  { id: "vcore-pro", name: "Yonex VCORE Pro", series: "VCORE", width: "97 in²", tag: "Rp 3.650.000", description: "Flex klasik, rasa kokoh untuk pemukul flat-drive.", details: ["97 in²", "310 g", "16×19", "Flex"], image: RACKET },
];

function AddToCart({ price }: { price?: string }) {
  const [added, setAdded] = React.useState(false);
  return (
    <button
      type="button"
      aria-pressed={added}
      onClick={() => setAdded((value) => !value)}
      className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-sm outline-none transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
    >
      {added ? (
        <>
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3.2 3L13 4.5" /></svg>
          Masuk keranjang
        </>
      ) : (
        <>Tambah ke keranjang{price ? ` · ${price}` : ""}</>
      )}
    </button>
  );
}

export default function SkateDeckRailDemo({ autoplay = true }: { autoplay?: boolean }) {
  return (
    <div data-skate-demo className="flex min-h-svh w-full items-center justify-center bg-background text-foreground">
      <SkateDeckRail
        items={SKATE_DEMO_DECKS}
        eyebrow="Rak raket · Tes tampilan"
        heading="Dinding raket yang bisa kamu putar langsung di halaman."
        caption="Sapu di sepanjang rak untuk menghadapkan satu raket, geser, angkat untuk lihat detail."
        autoplay={autoplay}
        detailAction={(deck) => <AddToCart key={deck.id} price={deck.tag} />}
        action={
          <button type="button" className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-sm outline-none transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none">
            Lihat semua raket
          </button>
        }
      />
    </div>
  );
}
