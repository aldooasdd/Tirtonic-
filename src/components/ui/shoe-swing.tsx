import * as React from "react";

/** Lebar ayunan & sepatu, relatif terhadap tinggi raket (skala nyata: raket 68 cm, sepatu ±30 cm, dibesarkan sedikit). */
export const SWING_W = 0.62;
const SHOE_W = 0.52;
/** Kanvas foto sepatu 2:1, sol menempel di tepi bawah. */
export const SHOE_ASPECT = 2;

// Ayunan = render 3D, dua lapis: belakang (plat, tali belakang, cincin, bayangan) & tali depan.
// Kanvas 0.62h × 0.97h; titik kait 0.0384h dari atas, permukaan plat 0.785h di bawah kait.
const SPRITE_H = 0.97;
const ANCHOR = 0.0384;
const SEAT = 0.801;

/** Ayunan plat baja + sepatu. (ax, ay) = titik kait, dalam kotak SWING_W·h × h. */
export function ShoeSwing({ h, ax, ay, image, hidden, shoeRef }: { h: number; ax: number; ay: number; image: string; hidden: boolean; shoeRef: (n: HTMLSpanElement | null) => void }) {
  const w = SHOE_W * h;
  const sh = w / SHOE_ASPECT;
  const base = ay + SEAT * h; // garis sol
  const layer: React.CSSProperties = { left: ax - (SWING_W * h) / 2, top: ay - ANCHOR * h, width: SWING_W * h, height: SPRITE_H * h, maxWidth: "none" };
  const mask = `url("${image}") center bottom / contain no-repeat`;
  const shape: React.CSSProperties = { WebkitMask: mask, mask };
  const box: React.CSSProperties = { left: ax - w / 2, top: base - sh, width: w, height: sh };
  const off = hidden ? "opacity-0" : "opacity-100";
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      {/* bayangan sepatu ke dinding */}
      <span className={`absolute transition-opacity duration-300 ${off}`} style={{ ...box, transform: `translate(${0.03 * h}px, ${0.02 * h}px)`, filter: `blur(${0.016 * h}px)` }}>
        <span className="absolute inset-0 bg-black/20" style={shape} />
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/shoe-swing-back.webp" alt="" decoding="async" draggable={false} className="absolute select-none" style={layer} />
      {/* bayangan sol di plat: siluet sepatu dipipihkan, lalu garis kontak gelap */}
      <span className={`absolute transition-opacity duration-300 ${off}`} style={{ left: ax - w * 0.47, top: base - 0.017 * h, width: w * 0.98, height: 0.03 * h, filter: `blur(${0.007 * h}px)`, background: "radial-gradient(50% 50% at 50% 50%, rgba(20,22,26,.7) 60%, transparent)" }} />
      <span className={`absolute transition-opacity duration-300 ${off}`} style={{ left: ax - w * 0.4, top: base - 0.01 * h, width: w * 0.82, height: 0.012 * h, filter: `blur(${0.0028 * h}px)`, background: "radial-gradient(50% 50% at 50% 50%, rgba(8,9,11,.9) 70%, transparent)" }} />
      <span ref={shoeRef} className="absolute block" style={{ ...box, visibility: hidden ? "hidden" : undefined }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" loading="lazy" decoding="async" draggable={false} className="size-full select-none object-contain object-bottom" />
        {/* cahaya: sisi bawah lebih gelap & sedikit redup dari plat */}
        <span className="absolute inset-0 mix-blend-multiply" style={{ ...shape, background: "linear-gradient(to top, rgba(80,84,92,.5), rgba(120,124,130,.16) 12%, transparent 34%)" }} />
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/shoe-swing-front.webp" alt="" decoding="async" draggable={false} className="absolute select-none" style={layer} />
    </span>
  );
}
