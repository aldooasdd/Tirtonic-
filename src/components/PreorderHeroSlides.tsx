"use client";

import { useEffect, useState } from "react";

// Slide foto banner hero PO (crossfade otomatis). Tinggi FLEKSIBEL: ikut rasio foto
// pertama yang diupload admin (foto[0] jadi penentu tinggi, sisanya overlay object-cover).
// ≤1 foto → diam. Teks/tombol overlay ada di parent (absolute, di atas layer ini).
function Slides({ imgs, alt, className }: { imgs: string[]; alt: string; className: string }) {
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
            (idx === 0
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
      <Slides imgs={mobile} alt={alt} className="sm:hidden" />
      <Slides imgs={desktop} alt={alt} className="hidden sm:block" />
    </>
  );
}
