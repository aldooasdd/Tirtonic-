"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Link tanpa skema ("tirtonic.com/x", "www.x.com") → tambah https://, biar tak jadi path relatif.
const fixLink = (l: string) => (/^(\/|#|https?:|mailto:|tel:)/i.test(l.trim()) ? l.trim() : "https://" + l.trim());

export type Slide = { id: string; gambar: string; gambarMobile: string | null; link: string | null };

export default function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);

  const touchX = useRef<number | null>(null);

  // Auto-geser 5 dtk; timer reset tiap slide ganti (termasuk habis di-swipe).
  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setTimeout(() => setI((v) => (v + 1) % slides.length), 5000);
    return () => clearTimeout(t);
  }, [i, slides.length]);

  // Swipe jari kiri/kanan (HP). Tap biasa tetap jalan ke link.
  function onTouchStart(e: React.TouchEvent) { touchX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current == null || slides.length <= 1) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 40) return;
    setI((v) => (v + (dx < 0 ? 1 : -1) + slides.length) % slides.length);
  }

  // Fallback when no slides added yet.
  if (slides.length === 0) {
    return (
      <section className="mx-auto max-w-site px-4 sm:-mt-20">
        <div className="flex h-[42vh] min-h-[240px] sm:h-[50vh] flex-col items-center justify-center overflow-hidden rounded-b-2xl bg-gradient-to-br from-primaryDark to-primary px-4 text-center text-white">
          <h1 className="text-4xl font-black uppercase leading-[0.95] drop-shadow sm:text-5xl">Garansi Tukar Ukuran</h1>
          <p className="mt-3 text-sm font-semibold">*HINGGA 7 HARI SETELAH PESANANMU DITERIMA</p>
          <Link href="/shop" className="mt-5 rounded bg-black/70 px-8 py-3 font-bold text-white">SHOP NOW</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-site px-4 sm:-mt-20">
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="relative h-[42vh] min-h-[240px] sm:h-[50vh] w-full touch-pan-y overflow-hidden rounded-b-2xl bg-primaryDark">
        {slides.map((s, idx) => {
          const img = (
            <>
              {/* mobile (square) — falls back to desktop image if none set */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading={idx === 0 ? "eager" : "lazy"} decoding="async" src={s.gambarMobile || s.gambar} alt="" className="h-full w-full object-cover sm:hidden" />
              {/* desktop (wide) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading={idx === 0 ? "eager" : "lazy"} decoding="async" src={s.gambar} alt="" className="hidden h-full w-full object-cover sm:block" />
            </>
          );
          return (
            <div
              key={s.id}
              className={`absolute inset-0 transition-opacity duration-700 ${idx === i ? "opacity-100" : "pointer-events-none opacity-0"}`}
            >
              {s.link ? <Link href={fixLink(s.link)} className="block h-full w-full">{img}</Link> : img}
            </div>
          );
        })}

        {slides.length > 1 && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setI(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${idx === i ? "w-6 bg-white" : "w-2 bg-white/60"}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
