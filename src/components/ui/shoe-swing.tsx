import * as React from "react";

/** Lebar papan ayunan & lebar sepatu, relatif terhadap tinggi raket. */
export const SWING_W = 0.7;
const SHOE_W = 0.6;
/** Kanvas foto sepatu 2:1, sol menempel di tepi bawah. */
export const SHOE_ASPECT = 2;

/** Ayunan papan kayu bertali segitiga + sepatu. (ax, ay) = titik kait; digambar dalam kotak SWING_W·h × h. */
export function ShoeSwing({ uid, h, ax, ay, image, hidden, shoeRef }: { uid: string; h: number; ax: number; ay: number; image: string; hidden: boolean; shoeRef: (n: HTMLSpanElement | null) => void }) {
  const boardW = SWING_W * h;
  const w = SHOE_W * h;
  const boardY = h * 0.91; // papan sejajar ujung grip raket
  const x0 = ax - boardW / 2;
  const x1 = ax + boardW / 2;
  const depth = w * 0.06;
  const thick = Math.max(8, w * 0.042);
  const inset = w * 0.055;
  const eye = boardY + depth * 0.5;
  const front = boardY + depth;
  const id = `${uid}-sw`;
  return (
    <>
      <svg aria-hidden="true" width={boardW} height={h} className="pointer-events-none absolute inset-0 overflow-visible">
        <defs>
          <linearGradient id={`${id}-top`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#c69a68" /><stop offset="1" stopColor="#dfb988" /></linearGradient>
          <linearGradient id={`${id}-edge`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#b98651" /><stop offset="1" stopColor="#8a5c32" /></linearGradient>
          <filter id={`${id}-soft`} x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="5" /></filter>
        </defs>
        {/* bayangan ke dinding */}
        <path d={`M${x0 + inset + 8},${eye + 10} L${ax + 8},${ay + 10} L${x1 - inset + 8},${eye + 10}`} fill="none" stroke="#000" strokeOpacity=".1" strokeWidth="2" />
        <rect x={x0 + 10} y={front + 12} width={boardW} height={thick} rx="6" fill="#000" fillOpacity=".22" filter={`url(#${id}-soft)`} />
        {/* kawat baja */}
        {([["#6b7280", 2.6], ["#d9dce1", 1.1]] as const).map(([c, t]) => (
          <path key={c} d={`M${x0 + inset},${eye} L${ax},${ay} L${x1 - inset},${eye}`} fill="none" stroke={c} strokeWidth={t} strokeLinejoin="round" />
        ))}
        {/* papan kayu: permukaan atas + sisi depan */}
        <path d={`M${x0 + depth * 0.9},${boardY} H${x1 - depth * 0.9} Q${x1 - depth * 0.3},${boardY} ${x1},${front} H${x0} Q${x0 + depth * 0.3},${boardY} ${x0 + depth * 0.9},${boardY} Z`} fill={`url(#${id}-top)`} />
        <path d={`M${x0},${front} H${x1} V${front + thick - 5} Q${x1},${front + thick} ${x1 - 5},${front + thick} H${x0 + 5} Q${x0},${front + thick} ${x0},${front + thick - 5} Z`} fill={`url(#${id}-edge)`} />
        {[0.3, 0.55, 0.78].map((k, n) => (
          <path key={k} d={`M${x0 + 6 + n * 14},${front + thick * k} q${boardW * 0.25},${n % 2 ? 1.6 : -1.6} ${boardW * 0.5},0 t${boardW * 0.4 - n * 12},0`} fill="none" stroke="#6d4522" strokeOpacity=".35" strokeWidth=".8" />
        ))}
        <path d={`M${x0 + 2},${front + 0.6} H${x1 - 2}`} stroke="#f3d7ad" strokeOpacity=".8" strokeWidth="1" />
        {/* bayangan sol */}
        <ellipse cx={ax} cy={boardY + depth * 0.55} rx={w * 0.45} ry={depth * 0.34} fill="#3b2410" fillOpacity={hidden ? 0 : 0.5} filter={`url(#${id}-soft)`} />
        {/* mur kawat */}
        {[x0 + inset, x1 - inset].map((x) => <g key={x}><ellipse cx={x} cy={eye} rx="4.4" ry="2.4" fill="#4b5563" /><ellipse cx={x - 0.6} cy={eye - 0.6} rx="2.4" ry="1.1" fill="#d1d5db" /></g>)}
      </svg>
      <span ref={shoeRef} className="absolute block" style={{ left: ax - w / 2, top: boardY + depth * 0.62 - w / SHOE_ASPECT, width: w, height: w / SHOE_ASPECT, visibility: hidden ? "hidden" : undefined }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" loading="lazy" decoding="async" draggable={false} className="pointer-events-none size-full select-none object-contain object-bottom" />
      </span>
    </>
  );
}
