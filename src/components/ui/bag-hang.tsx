import * as React from "react";

import type { BagInfo } from "@/lib/rail";

export type { BagInfo };

/** Lebar & tinggi tas paling besar, relatif terhadap tinggi raket. */
export const BAG_W = 0.76;
const BAG_H = 0.62;
const BASE = 0.845; // dasar tas sejajar plat sepatu

// Potongan tali hasil render 3D, 1600px = 1h: cincin+lilitan, tali lurus (berulang), lilitan atas handle.
const PX = 1 / 1600;

export function BagHang({ h, ax, ay, image, bag, hidden, bagRef }: { h: number; ax: number; ay: number; image: string; bag: BagInfo; hidden: boolean; bagRef: (n: HTMLSpanElement | null) => void }) {
  const w = Math.min(BAG_W / (2 * Math.max(bag.x, 1 - bag.x)), BAG_H * bag.ratio) * h * (bag.skala ?? 1); // titik ikat selalu di tengah jatah
  const bh = w / bag.ratio;
  const top = BASE * h - bh;
  const left = ax - bag.x * w;
  const tie = top + bag.y * bh; // atas handle di kolom titik ikat
  const grip = bag.grip * bh;
  const depan = bag.grip > 0; // ada lubang handle → tali melingkar lewat depan; tidak ada → tali masuk ke belakang tas
  const u = h * PX;
  const mask = `url("${image}") center / 100% 100% no-repeat`;
  const shape: React.CSSProperties = { WebkitMask: mask, mask };
  const box: React.CSSProperties = { left, top, width: w, height: bh };
  const strip = (from: number, to: number): React.CSSProperties => ({ left: ax - 24 * u, top: from, width: 48 * u, height: Math.max(0, to - from), backgroundImage: "url(/bag-rope-strip.webp)", backgroundSize: `${48 * u}px ${64 * u}px` });
  const start = ay + 0.058 * h; // keluar dari lilitan cincin
  const off = hidden ? "opacity-0" : "opacity-100";
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      {/* bayangan ke dinding */}
      <span className="absolute bg-black/20" style={{ left: ax + 0.02 * h, top: start, width: 0.02 * h, height: Math.max(0, tie - start), filter: `blur(${0.012 * h}px)` }} />
      <span className={`absolute transition-opacity duration-300 ${off}`} style={{ ...box, transform: `translate(${0.03 * h}px, ${0.024 * h}px)`, filter: `blur(${0.018 * h}px)` }}>
        <span className="absolute inset-0 bg-black/30" style={shape} />
      </span>
      {!depan && <span className="absolute" style={strip(start, tie + 0.05 * h)} />}
      <span ref={bagRef} className="absolute block" style={{ ...box, visibility: hidden ? "hidden" : undefined }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" loading="lazy" decoding="async" draggable={false} className="size-full select-none" />
        {/* bayangan tali di handle */}
        {depan && <span className="absolute inset-0" style={shape}>
          <span className="absolute bg-black/45" style={{ left: ax - left - 0.008 * h, top: bag.y * bh - 0.01 * h, width: 0.026 * h, height: grip + 0.012 * h, filter: `blur(${0.006 * h}px)` }} />
        </span>}
      </span>
      {/* tali turun, melingkar lewat depan handle lalu hilang ke belakang bawahnya */}
      {depan && <span className="absolute" style={{ ...strip(start, tie + grip), borderRadius: `0 0 ${6 * u}px ${6 * u}px` }} />}
      {depan && <span className="absolute" style={{ left: ax - 17 * u, top: tie + grip - 0.014 * h, width: 34 * u, height: 0.014 * h, background: "linear-gradient(to bottom, transparent, rgba(0,0,0,.75))", borderRadius: `0 0 ${8 * u}px ${8 * u}px` }} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/bag-rope-knot.webp" alt="" draggable={false} className="absolute max-w-none" style={{ left: ax - 24 * u, top: tie - 60 * u, width: 48 * u, height: 56 * u }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/bag-rope-top.webp" alt="" draggable={false} className="absolute max-w-none" style={{ left: ax - 40 * u, top: ay - 48 * u, width: 80 * u, height: 160 * u }} />
    </span>
  );
}
