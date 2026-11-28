"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Link tanpa skema ("tirtonic.com/x", "www.x.com") → tambah https://, biar tak jadi path relatif.
const fixLink = (l: string) => (/^(\/|#|https?:|mailto:|tel:)/i.test(l.trim()) ? l.trim() : "https://" + l.trim());

export type Slide = { id: string; gambar: string; gambarMobile: string | null; link: string | null };

const Wrap = ({ link, className, children }: { link: string | null; className: string; children: React.ReactNode }) =>
  link ? <Link href={fixLink(link)} className={className}>{children}</Link> : <div className={className}>{children}</div>;

/** Hero landing ala Extreme: slider besar (1600×970) + 2 banner samping (1070×470). HP: slider lalu banner bertumpuk. */
export default function HeroCarousel({ slides, samping = [] }: { slides: Slide[]; samping?: Slide[] }) {
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState<number | null>(null); // slide sebelumnya tetap tampil di bawah selama fade (tanpa efek pudar ganda)
  const pindah = (n: number) => setI((v) => { setPrev(v); return n; });
  const touchX = useRef<number | null>(null);
  // HP pakai gambar kotak kalau SEMUA slide punya gambar mobile; kalau tidak, pakai gambar utama 1600×970
  const kotak = slides.length > 0 && slides.every((s) => s.gambarMobile);

  // Auto-geser 5 dtk; timer reset tiap slide ganti (termasuk habis di-swipe).
  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setTimeout(() => pindah((i + 1) % slides.length), 5000);
    return () => clearTimeout(t);
  }, [i, slides.length]);

  // Swipe jari kiri/kanan (HP). Tap biasa tetap jalan ke link.
  function onTouchStart(e: React.TouchEvent) { touchX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current == null || slides.length <= 1) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 40) return;
    pindah((i + (dx < 0 ? 1 : -1) + slides.length) % slides.length);
  }

  // Fallback when no slides added yet.
  if (slides.length === 0 && samping.length === 0) {
    return (
      <section className="mx-auto max-w-site px-4 pt-4">
        <div className="flex aspect-[1600/970] max-h-[60vh] w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primaryDark to-primary px-4 text-center text-white">
          <h1 className="text-4xl font-black uppercase leading-[0.95] drop-shadow sm:text-5xl">Garansi Tukar Ukuran</h1>
          <p className="mt-3 text-sm font-semibold">*HINGGA 7 HARI SETELAH PESANANMU DITERIMA</p>
          <Link href="/shop" className="mt-5 rounded bg-black/70 px-8 py-3 font-bold text-white">SHOP NOW</Link>
        </div>
      </section>
    );
  }

  const dua = samping.slice(0, 2);
  // belum ada banner samping: slider selebar halaman dengan rasio banner lama (2400×920)
  const rasio = dua.length ? "sm:aspect-[1600/970]" : "sm:aspect-[2400/920]";
  return (
    <section className={`mx-auto grid max-w-site gap-3 px-4 pt-4 sm:gap-4 ${dua.length ? "lg:grid-cols-[3fr_2fr]" : ""}`}>
      {slides.length > 0 && (
        <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className={`relative w-full touch-pan-y overflow-hidden rounded-2xl bg-gray-100 ${kotak ? "aspect-square" : dua.length ? "aspect-[1600/970]" : "aspect-[2400/920]"} ${rasio}`}>
          {slides.map((s, idx) => (
            <div key={s.id} className={`absolute inset-0 transition-opacity duration-700 ${idx === i ? "z-10 opacity-100" : idx === prev ? "pointer-events-none z-0 opacity-100" : "pointer-events-none opacity-0 duration-0"}`}>
              <Wrap link={s.link} className="block h-full w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading={idx === 0 ? "eager" : "lazy"} decoding="async" src={(kotak && s.gambarMobile) || s.gambar} alt="" className="h-full w-full object-cover sm:hidden" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading={idx === 0 ? "eager" : "lazy"} decoding="async" src={s.gambar} alt="" className="hidden h-full w-full object-cover sm:block" />
              </Wrap>
            </div>
          ))}
          {slides.length > 1 && (
            <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2">
              {slides.map((s, idx) => (
                <button key={s.id} onClick={() => idx !== i && pindah(idx)} aria-label={`Slide ${idx + 1}`} className={`h-2 rounded-full transition-all ${idx === i ? "w-6 bg-white" : "w-2 bg-white/60"}`} />
              ))}
            </div>
          )}
        </div>
      )}
      {dua.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-1 lg:grid-rows-2">
          {dua.map((s) => (
            <Wrap key={s.id} link={s.link} className="block aspect-[1070/470] overflow-hidden rounded-2xl bg-gray-100 lg:aspect-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="eager" decoding="async" src={s.gambar} alt="" className="h-full w-full object-cover" />
            </Wrap>
          ))}
        </div>
      )}
    </section>
  );
}
