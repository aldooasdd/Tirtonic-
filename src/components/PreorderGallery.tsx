"use client";

import { useEffect, useRef, useState } from "react";

// Galeri foto detail PO: auto-slide + geser (drag/swipe) di HP & desktop, titik di bawah.
export default function PreorderGallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  const startX = useRef<number | null>(null);
  const paused = useRef(false);
  const multi = images.length > 1;

  // Auto-slide tiap 4 detik; jeda saat user sedang menggeser.
  useEffect(() => {
    if (!multi) return;
    const t = setInterval(() => { if (!paused.current) setI((p) => (p + 1) % images.length); }, 4000);
    return () => clearInterval(t);
  }, [multi, images.length]);

  if (images.length === 0) return <div className="aspect-square rounded-2xl border bg-gray-100" />;
  const go = (d: number) => setI((p) => (p + d + images.length) % images.length);

  // Pointer events = satu handler buat touch (HP) + mouse drag (desktop).
  function onPointerDown(e: React.PointerEvent) { startX.current = e.clientX; paused.current = true; }
  function onPointerUp(e: React.PointerEvent) {
    if (startX.current !== null) {
      const dx = e.clientX - startX.current;
      if (multi && Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); // geser kiri = berikutnya
    }
    startX.current = null;
    paused.current = false;
  }

  return (
    <div>
      <div
        className="relative aspect-square cursor-grab touch-pan-y overflow-hidden rounded-2xl border bg-gray-100 active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={() => { startX.current = null; paused.current = false; }}
      >
        {images.map((g, idx) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={g + idx}
            loading={idx === 0 ? "eager" : "lazy"}
            decoding="async"
            src={g}
            alt={alt}
            draggable={false}
            className={`absolute inset-0 h-full w-full select-none object-cover transition-opacity duration-300 ${idx === i ? "opacity-100" : "opacity-0"}`}
          />
        ))}
      </div>
      {multi && (
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
