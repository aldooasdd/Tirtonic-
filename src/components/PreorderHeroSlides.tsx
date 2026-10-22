"use client";

import { useEffect, useState } from "react";

// Slide foto banner hero PO (crossfade otomatis).
// - desktop: tinggi FLEKSIBEL ikut rasio foto pertama (banner landscape dari admin).
// - mobile (cover): rasio hero tetap + object-cover, biar foto produk potret tampil rapi.
function Slides({ imgs, alt, className, cover }: { imgs: string[]; alt: string; className: string; cover?: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (imgs.length <= 1) return;
    const t = setInterval(() => setI((p) => (p + 1) % imgs.length), 4000);
    return () => clearInterval(t);
  }, [imgs.length]);
  if (imgs.length === 0) return null;
  return (
    <div className={`relative ${className}`}>
      {imgs.map((src, idx) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src + idx}
          loading={idx === 0 ? "eager" : "lazy"}
          decoding="async"
          src={src}
          alt={alt}
          className={
            (cover
              ? "absolute inset-0 h-full w-full object-cover object-center"
              : idx === 0
                ? "block h-auto w-full" // penentu tinggi (rasio asli)
                : "absolute inset-0 h-full w-full object-cover") +
            ` transition-opacity duration-700 ${idx === i ? "opacity-100" : "opacity-0"}`
          }
        />
      ))}
    </div>
  );
}

export default function PreorderHeroSlides({ desktop, mobile, alt }: { desktop: string[]; mobile: string[]; alt: string }) {
  return (
    <>
      <Slides imgs={mobile} alt={alt} className="aspect-[4/5] sm:hidden" cover />
      <Slides imgs={desktop} alt={alt} className="hidden sm:block" />
    </>
  );
}
