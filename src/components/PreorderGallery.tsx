"use client";

import { useRef, useState } from "react";

// Galeri foto detail PO: foto utama bisa di-slide (panah / swipe), titik di bawah.
export default function PreorderGallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  const startX = useRef<number | null>(null);
  if (images.length === 0) return <div className="aspect-square rounded-2xl border bg-gray-100" />;
  const go = (d: number) => setI((p) => (p + d + images.length) % images.length);

  function onTouchStart(e: React.TouchEvent) { startX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    if (startX.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); // geser kiri = berikutnya
    startX.current = null;
  }

  return (
    <div>
      <div
        className="relative aspect-square overflow-hidden rounded-2xl border bg-gray-100"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {images.map((g, idx) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={g + idx}
            loading={idx === 0 ? "eager" : "lazy"}
            decoding="async"
            src={g}
            alt={alt}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${idx === i ? "opacity-100" : "opacity-0"}`}
          />
        ))}
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Sebelumnya" className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-800 shadow backdrop-blur hover:bg-white">‹</button>
            <button type="button" onClick={() => go(1)} aria-label="Berikutnya" className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-800 shadow backdrop-blur hover:bg-white">›</button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex justify-center gap-2">
          {images.map((g, idx) => (
            <button
              type="button"
              key={g + idx}
              onClick={() => setI(idx)}
              aria-label={`Foto ${idx + 1}`}
              className={`h-2 rounded-full transition-all ${idx === i ? "w-5 bg-primary" : "w-2 bg-gray-300 hover:bg-gray-400"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
