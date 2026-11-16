"use client";

import { useEffect, useRef, useState } from "react";

/** Slider foto dokumentasi di kartu riwayat: geser (swipe/scroll) + jalan otomatis. Tanpa perbesar. */
export default function PhotoSlider({ photos, badge, brand, className = "relative aspect-[16/10] overflow-hidden bg-neutral-900", dotsClass = "bottom-3" }: { photos: string[]; badge?: string; brand?: string; className?: string; dotsClass?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (photos.length < 2) return;
    const t = setInterval(() => {
      const el = ref.current;
      if (!el || el.matches(":hover")) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % photos.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, 3500);
    return () => clearInterval(t);
  }, [photos.length]);

  return (
    <div className={className}>
      <div
        ref={ref}
        onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((u) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={u} src={u} alt="" loading="lazy" draggable={false} className="h-full w-full shrink-0 snap-center object-cover" />
        ))}
      </div>
      {brand && <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-5">
        <span className="rounded-md border border-lime-300/20 bg-black/50 px-2.5 py-1 text-[11px] font-[800] uppercase tracking-widest text-lime-300 backdrop-blur-md">{brand}</span>
        {badge && <span className="rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-[500] text-white/90 backdrop-blur-md">{badge}</span>}
      </div>}
      {photos.length > 1 && (
        <div className={`pointer-events-none absolute inset-x-0 ${dotsClass} flex justify-center gap-1`}>
          {photos.map((u, k) => <span key={u} className={`h-1.5 rounded-full bg-white transition-all ${k === i ? "w-4 opacity-100" : "w-1.5 opacity-60"}`} />)}
        </div>
      )}
    </div>
  );
}
