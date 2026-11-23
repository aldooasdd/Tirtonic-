"use client";

import * as React from "react";
import { createPortal } from "react-dom";

export interface SkateDeck {
  id: string;
  /** Accessible name, caption and detail title, e.g. `Sunset Bands 8.25"`. */
  name: string;
  /** Collection line shown with the price under the rail and above the name in the detail view. */
  series?: string;
  /** Deck width such as `8.25"`. */
  width?: string;
  description?: string;
  /** Graphic-side photo: a transparent cut-out of one deck, nose up, filling a tall canvas (0.238 wide per 1 high, e.g. 238 x 1000). */
  image: string;
  /** Short tag such as a price, hung from the hook. */
  tag?: string;
  /** Semua varian, tampil di atas harga pada popup; sold = dicoret. */
  variants?: { label: string; sold: boolean }[];
  /** Short facts shown as chips in the detail view (wheelbase, plies, concave …). */
  details?: string[];
}

export interface SkateDeckRailLabels {
  close: string;
  open: string;
}

export interface SkateDeckRailProps extends React.ComponentProps<"section"> {
  items: SkateDeck[];
  eyebrow?: string;
  heading?: string;
  /** Shown under the rail while no deck faces the front. */
  caption?: string;
  /** Call to action under the caption. */
  action?: React.ReactNode;
  /** Rendered under the specs in the detail view, e.g. an "Add to cart" button. */
  detailAction?: (deck: SkateDeck, index: number) => React.ReactNode;
  /** Turns the decks to the front one by one until the visitor interacts. */
  autoplay?: boolean;
  /** Milliseconds each deck faces the front during autoplay. */
  interval?: number;
  /** Controlled index of the deck facing the front; `null` for none. Leave undefined to let the rail manage it. */
  active?: number | null;
  onActiveChange?: (index: number | null) => void;
  onOpenChange?: (index: number | null) => void;
  labels?: SkateDeckRailLabels;
}

const DECK_ASPECT = 0.406; // foto raket dipotong pas di tepi frame (lebar : tinggi)
const PERSPECTIVE = 900;
const LIFT_Z = 24;
const LIFT_SCALE = 0.03;
const GAP = 0.06;
const FRONT_EXTRA = 0; // raket yang menghadap depan tidak menggeser tetangganya
const MAX_H = 460;
const CAROUSEL_MAX_H = 430;
const EDGE = 24;
const RAIL_TOP = 14;
const RAIL_Y = 0.022;
const HOOK_LEN = 0.085;
const HOLE_Y = 0.013; // titik kait = tengah frame atas raket
const FOOT_PX = 72; // ruang nama + harga di bawah raket
const FOOT = 0.085;
const STAGE_K = 1 + RAIL_Y + HOOK_LEN - HOLE_Y + FOOT;
const SWING_K = 26;
const SWING_DAMP = 2.3;
const SWING_LIMIT = 8;
const RAIL_GAP = 0.6; // jarak antar raket di rel (× lebar raket)
const CAROUSEL_BELOW = 640; // di bawah lebar ini: satu raket di tengah
const COUPLE = 0.035;
const HANG_SHARE = 0.3;
const RAD = Math.PI / 180;
const DEFAULT_LABELS: SkateDeckRailLabels = { close: "Tutup", open: "Lihat" };

const DECK_PATH = "M3,150 C3,46 53,4 119,4 C185,4 235,46 235,150 L235,850 C235,954 185,996 119,996 C53,996 3,954 3,850 Z";
const FALLBACK_MASK = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 238 1000' preserveAspectRatio='none'><path d='${DECK_PATH}'/></svg>`)}")`;
const CONCAVE = "linear-gradient(90deg, color-mix(in oklab, black 46%, transparent) 0%, transparent 15%, color-mix(in oklab, white 13%, transparent) 50%, transparent 85%, color-mix(in oklab, black 46%, transparent) 100%), linear-gradient(to bottom, color-mix(in oklab, white 14%, transparent) 0%, transparent 9%, transparent 91%, color-mix(in oklab, white 10%, transparent) 100%)";
const RAIL_GRADIENT = "linear-gradient(to bottom, color-mix(in oklab, var(--rail-ink) 56%, white) 0%, color-mix(in oklab, var(--rail-ink) 84%, white) 17%, var(--rail-ink) 46%, color-mix(in oklab, var(--rail-ink) 72%, black) 80%, color-mix(in oklab, var(--rail-ink) 50%, black) 100%)";
const REST_SHADE = "linear-gradient(90deg, color-mix(in oklab, black 34%, transparent), color-mix(in oklab, black 12%, transparent) 45%, color-mix(in oklab, black 4%, transparent))";
const BRACKET_GRADIENT = "linear-gradient(to right, color-mix(in oklab, var(--rail-ink) 70%, white), var(--rail-ink) 55%, color-mix(in oklab, var(--rail-ink) 60%, black))";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function restAngle(_i: number) {
  return -22; // sudut sama semua supaya barisan rapi
}

function maskStyle(mask: string, fallback: boolean): React.CSSProperties {
  const value = `${mask} center / ${fallback ? "100% 100%" : "contain"} no-repeat`;
  return { WebkitMask: value, mask: value };
}

function railThickness(h: number) {
  return Math.max(8, Math.round(h * 0.032));
}

function stageGeometry(h: number) {
  const railY = Math.round(RAIL_TOP + RAIL_Y * h);
  const top = railY + (HOOK_LEN - HOLE_Y) * h;
  return { railY, railT: railThickness(h), top, height: Math.round(top + h + FOOT_PX + FOOT * h) };
}

function hookGeometry(h: number) {
  const r = railThickness(h) / 2;
  const t = Math.max(1.7, h * 0.0078);
  const rc = r * 0.95 + t * 0.6;
  const lift = r + t / 2 - rc; // lengkung atas menempel di punggung rel
  const length = HOOK_LEN * h;
  const pad = t + 3;
  const cx = pad + t / 2;
  const cy = r + rc + pad;
  const width = cx + 2 * rc + pad + t;
  const height = cy + length + pad;
  const r2 = rc * 0.6;
  const dip = cy + length + h * 0.0095 - r2 + t / 2; // dasar kait menempel di sisi dalam frame
  const f = (n: number) => n.toFixed(2);
  return {
    t, rc, cx, cy, width, height,
    left: -cx,
    top: HOLE_Y * h - (cy + length),
    pivotX: rc,
    pivotY: -(HOOK_LEN - HOLE_Y) * h - lift,
    // kait turun di BELAKANG frame, keluar di dalam lingkaran, lalu ujungnya naik di DEPAN frame
    shank: `M${f(cx + r2)},${f(dip + r2)} A${f(r2)},${f(r2)} 0 0 1 ${f(cx)},${f(dip)} L${f(cx)},${f(cy - lift)}`,
    tip: `M${f(cx + r2)},${f(dip + r2)} A${f(r2)},${f(r2)} 0 0 0 ${f(cx + 2 * r2)},${f(dip)} L${f(cx + 2 * r2)},${f(cy + length - h * 0.005)}`,
    // atas: separuh kiri di belakang rel (dipotong setebal rel), separuh kanan turun di depan rel
    over: `A${f(rc)},${f(rc)} 0 0 1 ${f(cx + rc)},${f(cy - lift - rc)}`,
    curl: `M${f(cx + rc)},${f(cy - lift - rc)} A${f(rc)},${f(rc)} 0 0 1 ${f(cx + 2 * rc)},${f(cy - lift)} L${f(cx + 2 * rc)},${f(cy + r * 0.6)}`,
    railTop: cy - r,
    railBottom: cy + r,
  };
}

function Defs({ uid, h }: { uid: string; h: number }) {
  const g = hookGeometry(h);
  return (
    <svg aria-hidden="true" width="0" height="0" className="absolute" focusable="false">
      <defs>
        <clipPath id={`${uid}-behind`} clipPathUnits="userSpaceOnUse">
          <rect x={-50} y={-50} width={g.width + 100} height={50 + g.railTop} />
          <rect x={-50} y={g.railBottom} width={g.width + 100} height={g.height + 50} />
        </clipPath>
        <filter id={`${uid}-powder`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
    </svg>
  );
}

function Hook({ uid, h, part }: { uid: string; h: number; part: "back" | "front" }) {
  const g = hookGeometry(h);
  const back = part === "back";
  return (
    <svg aria-hidden="true" data-hook={part} width={g.width} height={g.height} viewBox={`0 0 ${g.width.toFixed(2)} ${g.height.toFixed(2)}`} className="pointer-events-none absolute overflow-visible" style={{ left: `calc(50% + ${g.left.toFixed(2)}px)`, top: g.top }}>
      <g clipPath={back ? `url(#${uid}-behind)` : undefined}>
      <g fill="none" strokeLinecap="round" stroke="black" strokeOpacity="0.3" strokeWidth={g.t + 0.6} transform="translate(0.9 1.3)">
        <path d={back ? `${g.shank} ${g.over}` : `${g.tip} ${g.curl}`} />
      </g>
      {/* logam: gelap di tepi, terang di tengah — sama untuk batang, lengkung, dan ujung */}
      {[["#6b7280", 1, 0], ["#c4c8ce", 0.7, -0.06], ["#ffffff", 0.28, -0.14]].map(([ink, k, shift]) => (
        <g key={ink as string} fill="none" stroke={ink as string} strokeWidth={g.t * (k as number)} strokeLinecap="round" strokeLinejoin="round" transform={`translate(${(g.t * (shift as number)).toFixed(2)} 0)`}>
          <path d={back ? `${g.shank} ${g.over}` : `${g.tip} ${g.curl}`} />
        </g>
      ))}
      </g>
    </svg>
  );
}

function FallbackArt({ tone }: { tone: number }) {
  const ink = `var(--color-chart-${(tone % 5) + 1})`;
  return (
    <span
      aria-hidden="true"
      data-fallback
      className="absolute inset-0"
      style={{
        ...maskStyle(FALLBACK_MASK, true),
        background: `radial-gradient(circle at 50% 22%, color-mix(in oklab, white 85%, ${ink}) 0 7%, transparent 7.4%), repeating-linear-gradient(to bottom, color-mix(in oklab, ${ink} 82%, var(--color-card)) 0 9%, color-mix(in oklab, ${ink} 62%, black) 9% 10.5%), ${CONCAVE}`,
      }}
    />
  );
}

type Sim = {
  x: number[]; vx: number[]; tx: number[];
  turn: number[]; vturn: number[]; tturn: number[];
  swing: number[]; vswing: number[];
  tag: number[]; vtag: number[];
  frameX: number[]; frameV: number[]; acc: number[];
  drag: number; free: number; last: number; raf: number;
  // geser rel (desktop/tablet): posisi dasar tiap raket, offset, kecepatan, tujuan (panah/keyboard), batas
  base: number[]; scroll: number; sv: number; goal: number | null; max: number; pan: boolean;
};

function emptySim(): Sim {
  return { x: [], vx: [], tx: [], turn: [], vturn: [], tturn: [], swing: [], vswing: [], tag: [], vtag: [], frameX: [], frameV: [], acc: [], drag: -1, free: 0, last: 0, raf: 0, base: [], scroll: 0, sv: 0, goal: null, max: 0, pan: false };
}

function footprint(h: number, e: number) {
  return h * DECK_ASPECT * (1 + FRONT_EXTRA * clamp(e, 0, 1));
}

function progress(turn: number, i: number) {
  return clamp(1 - turn / restAngle(i), 0, 1.12);
}

export function SkateDeckRail({
  items,
  eyebrow,
  heading,
  caption,
  action,
  detailAction,
  autoplay = false,
  interval = 2600,
  active: activeProp,
  onActiveChange,
  onOpenChange,
  labels = DEFAULT_LABELS,
  className,
  ...rest
}: SkateDeckRailProps) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const count = items.length;
  const stageRef = React.useRef(null as HTMLDivElement | null);
  const slots = React.useRef([] as (HTMLButtonElement | null)[]);
  const hangs = React.useRef([] as (HTMLSpanElement | null)[]);
  const swings = React.useRef([] as (HTMLSpanElement | null)[]);
  const turns = React.useRef([] as (HTMLSpanElement | null)[]);
  const shades = React.useRef([] as (HTMLSpanElement | null)[]);
  const glints = React.useRef([] as (HTMLSpanElement | null)[]);
  const nears = React.useRef([] as (HTMLSpanElement | null)[]);
  const fars = React.useRef([] as (HTMLSpanElement | null)[]);
  const sim = React.useRef(emptySim());
  const [size, setSize] = React.useState({ width: 0, h: 300, carousel: false });
  const [innerActive, setInnerActive] = React.useState(null as number | null);
  const controlled = activeProp !== undefined;
  const wanted = controlled ? activeProp : innerActive;
  const active = wanted !== null && wanted !== undefined && wanted >= 0 && wanted < count ? wanted : null;
  const [focusIndex, setFocusIndex] = React.useState(0);
  const [openIndex, setOpenIndex] = React.useState(null as number | null);
  const [reduced, setReduced] = React.useState(false);
  const [playing, setPlaying] = React.useState(autoplay);
  const [lifted, setLifted] = React.useState(null as number | null);
  const [failed, setFailed] = React.useState({} as { [id: string]: boolean });
  const [maxScroll, setMaxScroll] = React.useState(0);
  const returnFocus = React.useRef(null as number | null);
  const pendingOpen = React.useRef(-1);
  const pointer = React.useRef({ id: -1, index: -1, x: 0, y: 0, moved: false, kind: "", swipe: 0, lastX: 0, lastT: 0, v: 0 });
  const live = React.useRef({ active: null as number | null, requested: null as number | null | undefined, size, reduced, count, openIndex: null as number | null, carouselIndex: 0, controlled, onActiveChange, onOpenChange });
  live.current = { ...live.current, active, size, reduced, count, openIndex, controlled, onActiveChange, onOpenChange };

  const carouselIndex = size.carousel ? (active ?? live.current.carouselIndex) : null;
  const geo = stageGeometry(size.h);
  const w = size.h * DECK_ASPECT;

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  React.useEffect(() => { setPlaying(autoplay); }, [autoplay]);

  React.useLayoutEffect(() => {
    const stage = stageRef.current;
    const section = stage?.parentElement;
    if (!stage || !section) return;
    const measure = () => {
      const width = stage.clientWidth;
      if (!width) return;
      const chrome = section.getBoundingClientRect().height - stage.getBoundingClientRect().height;
      const byHeight = (window.innerHeight - chrome - 12 - RAIL_TOP - FOOT_PX) / STAGE_K;
      const carousel = width < CAROUSEL_BELOW;
      const raw = carousel ? Math.min(CAROUSEL_MAX_H, width * 0.92, byHeight) : Math.min(MAX_H, width * 0.42, byHeight);
      const h = Math.round(Math.max(150, raw));
      setSize((old) => (Math.abs(old.width - width) < 0.5 && old.carousel === carousel && Math.abs(old.h - h) < 1 ? old : { width, h, carousel }));
    };
    measure();
    const observer = new ResizeObserver(() => measure());
    observer.observe(stage);
    observer.observe(section);
    window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [count]);

  const targets = React.useCallback((h: number, width: number, carousel: boolean, front: number | null, centre: number) => {
    const deckW = h * DECK_ASPECT;
    const feet = items.map((_, i) => footprint(h, i === front ? 1 : 0));
    if (carousel) {
      const gap = GAP * h * 1.5;
      const c = clamp(centre, 0, Math.max(0, feet.length - 1));
      const xs = feet.map(() => 0);
      xs[c] = width / 2;
      for (let i = c + 1; i < feet.length; i++) xs[i] = (xs[i - 1] ?? 0) + ((feet[i - 1] ?? 0) + (feet[i] ?? 0)) / 2 + gap;
      for (let i = c - 1; i >= 0; i--) xs[i] = (xs[i + 1] ?? 0) - ((feet[i + 1] ?? 0) + (feet[i] ?? 0)) / 2 - gap;
      return xs;
    }
    const pitch = deckW * (1 + RAIL_GAP);
    const span = pitch * feet.length;
    const start = span <= width ? (width - span) / 2 : EDGE; // muat → di tengah; tidak muat → bisa digeser
    return feet.map((_, i) => start + pitch * (i + 0.5));
  }, [items]);

  const paint = React.useCallback((i: number) => {
    const s = sim.current;
    const { h } = live.current.size;
    const deckW = h * DECK_ASPECT;
    const slot = slots.current[i];
    if (!slot) return;
    const angle = s.turn[i] ?? restAngle(i);
    const e = progress(angle, i);
    const lift = Math.min(1, e);
    const theta = s.swing[i] ?? 0;
    slot.style.transform = `translate3d(${((s.x[i] ?? 0) - deckW / 2).toFixed(2)}px,0,0)`;
    const hang = hangs.current[i];
    if (hang) hang.style.transform = `rotate(${(theta * HANG_SHARE).toFixed(3)}deg)`;
    const sw = swings.current[i];
    if (sw) sw.style.transform = `rotate(${(theta * (1 - HANG_SHARE)).toFixed(3)}deg)`;
    const tu = turns.current[i];
    if (tu) tu.style.transform = `perspective(${PERSPECTIVE}px) rotateY(${angle.toFixed(2)}deg) translateZ(${(LIFT_Z * lift).toFixed(2)}px) scale(${(1 + LIFT_SCALE * e).toFixed(4)})`;
    const shade = shades.current[i];
    if (shade) shade.style.opacity = (1 - lift).toFixed(3);
    const glint = glints.current[i];
    if (glint) {
      glint.style.transform = `translate3d(${(-140 + 290 * lift).toFixed(1)}%,0,0) skewX(-14deg)`;
      glint.style.opacity = (Math.sin(Math.PI * clamp(lift, 0, 1)) * 0.95).toFixed(3);
    }
    const near = nears.current[i];
    if (near) {
      near.style.opacity = (1 - lift).toFixed(3);
      near.style.transform = `translate3d(${(deckW * 0.07).toFixed(1)}px, ${(h * 0.012).toFixed(1)}px, 0)`;
    }
    const far = fars.current[i];
    if (far) {
      far.style.opacity = lift.toFixed(3);
      far.style.transform = `translate3d(${(deckW * (0.07 + 0.2 * lift)).toFixed(1)}px, ${(h * (0.012 + 0.045 * lift)).toFixed(1)}px, 0) scale(${(1 + 0.05 * lift).toFixed(3)})`;
    }
  }, []);

  const step = React.useCallback((now: number) => {
    const s = sim.current;
    const n = live.current.count;
    // slow frames keep wall-clock time: up to 100 ms per frame, integrated in sub-steps of at most ~17 ms
    const dt = s.last ? Math.min(0.1, (now - s.last) / 1000) : 1 / 60;
    s.last = now;
    const { h, carousel } = live.current.size;
    const deckW = h * DECK_ASPECT;
    const tail = h * (1 - HOLE_Y) + HOOK_LEN * h * HANG_SHARE;
    const spacing = (i: number) => (footprint(h, progress(s.turn[i] ?? 0, i)) + footprint(h, progress(s.turn[i + 1] ?? 0, i + 1))) / 2 + h * 0.012;
    for (let i = 0; i < n; i++) s.frameX[i] = s.x[i] ?? 0;
    if (!carousel) {
      if (!s.pan) {
        if (s.goal !== null) {
          s.scroll += (s.goal - s.scroll) * (1 - Math.exp(-7 * dt));
          s.sv = 0;
          if (Math.abs(s.goal - s.scroll) < 0.4) { s.scroll = s.goal; s.goal = null; }
        } else {
          s.scroll += s.sv * dt;
          s.sv *= Math.exp(-3.2 * dt);
          const over = s.scroll - clamp(s.scroll, 0, s.max);
          if (over) { s.scroll -= over * (1 - Math.exp(-12 * dt)); s.sv *= Math.exp(-14 * dt); if (Math.abs(over) < 0.4) s.scroll = clamp(s.scroll, 0, s.max); }
          if (Math.abs(s.sv) < 4) s.sv = 0;
        }
      }
      for (let i = 0; i < n; i++) { s.tx[i] = (s.base[i] ?? 0) - s.scroll; s.x[i] = s.tx[i] ?? 0; s.vx[i] = 0; }
    }
    const sub = Math.max(2, Math.ceil(dt / 0.017));
    const sdt = dt / sub;
    for (let k = 0; k < sub; k++) {
      for (let i = 0; i < n; i++) {
        if (!carousel) break; // mode rel: posisi ikut geseran, bukan pegas
        const restoring = now > s.free;
        const stiff = restoring ? 130 : 0;
        const damp = restoring ? 2 * Math.sqrt(130) * 0.86 : 3.2;
        const ax = -stiff * ((s.x[i] ?? 0) - (s.tx[i] ?? 0)) - damp * (s.vx[i] ?? 0);
        s.vx[i] = (s.vx[i] ?? 0) + ax * sdt;
        s.x[i] = (s.x[i] ?? 0) + (s.vx[i] ?? 0) * sdt;
      }
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < n - 1; i++) {
          const a = s.x[i] ?? 0;
          const b = s.x[i + 1] ?? 0;
          const overlap = spacing(i) - (b - a);
          if (overlap <= 0) continue;
          if (i === s.drag) s.x[i + 1] = b + overlap;
          else if (i + 1 === s.drag) s.x[i] = a - overlap;
          else { s.x[i] = a - overlap / 2; s.x[i + 1] = b + overlap / 2; }
          const va = s.vx[i] ?? 0;
          const vb = s.vx[i + 1] ?? 0;
          if (va > vb) {
            const shared = (va + vb) / 2;
            const kick = (va - vb) * 0.12;
            if (i !== s.drag) s.vx[i] = shared - kick;
            if (i + 1 !== s.drag) s.vx[i + 1] = shared + kick;
          }
        }
      }
      for (let i = 0; i < n; i++) {
        const ta = -150 * ((s.turn[i] ?? 0) - (s.tturn[i] ?? 0)) - 2 * Math.sqrt(150) * 0.78 * (s.vturn[i] ?? 0);
        s.vturn[i] = (s.vturn[i] ?? 0) + ta * sdt;
        s.turn[i] = (s.turn[i] ?? 0) + (s.vturn[i] ?? 0) * sdt;
        const sa = -SWING_K * (s.swing[i] ?? 0) - SWING_DAMP * (s.vswing[i] ?? 0) + (s.acc[i] ?? 0) * COUPLE;
        s.vswing[i] = (s.vswing[i] ?? 0) + sa * sdt;
        let swing = (s.swing[i] ?? 0) + (s.vswing[i] ?? 0) * sdt;
        if (Math.abs(swing) > SWING_LIMIT) {
          swing = Math.sign(swing) * SWING_LIMIT;
          if ((s.vswing[i] ?? 0) * swing > 0) s.vswing[i] = -(s.vswing[i] ?? 0) * 0.25;
        }
        s.swing[i] = swing;
        const tagA = -46 * ((s.tag[i] ?? 0) - swing * 0.6) - 3.4 * (s.vtag[i] ?? 0) - (s.vswing[i] ?? 0) * 0.9;
        s.vtag[i] = (s.vtag[i] ?? 0) + tagA * sdt;
        s.tag[i] = clamp((s.tag[i] ?? 0) + (s.vtag[i] ?? 0) * sdt, -30, 30);
      }
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < n - 1; i++) {
          if (progress(s.turn[i] ?? 0, i) > 0.5 || progress(s.turn[i + 1] ?? 0, i + 1) > 0.5) continue;
          const ta = (s.x[i] ?? 0) - tail * Math.sin((s.swing[i] ?? 0) * RAD);
          const tb = (s.x[i + 1] ?? 0) - tail * Math.sin((s.swing[i + 1] ?? 0) * RAD);
          const overlap = deckW * 0.98 + 1 - (tb - ta);
          if (overlap <= 0) continue;
          const turn = overlap / 2 / tail / RAD;
          s.swing[i] = clamp((s.swing[i] ?? 0) + turn, -SWING_LIMIT, SWING_LIMIT);
          s.swing[i + 1] = clamp((s.swing[i + 1] ?? 0) - turn, -SWING_LIMIT, SWING_LIMIT);
          const wa = s.vswing[i] ?? 0;
          const wb = s.vswing[i + 1] ?? 0;
          if (wa < wb) {
            const mean = (wa + wb) / 2;
            s.vswing[i] = mean + (wb - wa) * 0.18;
            s.vswing[i + 1] = mean - (wb - wa) * 0.18;
          }
        }
      }
    }
    for (let i = 0; i < n; i++) {
      const v = ((s.x[i] ?? 0) - (s.frameX[i] ?? 0)) / dt;
      const a = (v - (s.frameV[i] ?? 0)) / dt;
      s.frameV[i] = v;
      s.acc[i] = (s.acc[i] ?? 0) * 0.5 + clamp(a, -30000, 30000) * 0.5;
    }
    const out = s.scroll !== clamp(s.scroll, 0, s.max);
    let busy = s.drag >= 0 || now < s.free || (!carousel && (s.pan || s.sv !== 0 || s.goal !== null || out));
    for (let i = 0; i < n; i++) {
      paint(i);
      if (Math.abs(s.vx[i] ?? 0) > 0.4 || (now > s.free && Math.abs((s.x[i] ?? 0) - (s.tx[i] ?? 0)) > 0.25) || Math.abs((s.turn[i] ?? 0) - (s.tturn[i] ?? 0)) > 0.05 || Math.abs(s.vturn[i] ?? 0) > 0.05 || Math.abs(s.swing[i] ?? 0) > 0.02 || Math.abs(s.vswing[i] ?? 0) > 0.05 || Math.abs(s.tag[i] ?? 0) > 0.05 || Math.abs(s.vtag[i] ?? 0) > 0.08 || Math.abs(s.acc[i] ?? 0) > 1) busy = true;
    }
    if (busy) s.raf = requestAnimationFrame(step);
    else {
      s.raf = 0; s.last = 0;
      for (let i = 0; i < n; i++) {
        if (now > s.free) s.x[i] = s.tx[i] ?? 0;
        s.turn[i] = s.tturn[i] ?? restAngle(i); s.vturn[i] = 0;
        s.swing[i] = 0; s.vswing[i] = 0; s.tag[i] = 0; s.vtag[i] = 0; s.acc[i] = 0; s.frameV[i] = 0;
        paint(i);
      }
    }
  }, [paint]);

  const kick = React.useCallback(() => {
    const s = sim.current;
    if (live.current.reduced) {
      for (let i = 0; i < live.current.count; i++) {
        if (!live.current.size.carousel) s.tx[i] = (s.base[i] ?? 0) - s.scroll;
        s.x[i] = s.tx[i] ?? 0; s.vx[i] = 0; s.turn[i] = s.tturn[i] ?? restAngle(i); s.vturn[i] = 0;
        s.swing[i] = 0; s.vswing[i] = 0; s.tag[i] = 0; s.vtag[i] = 0; s.acc[i] = 0; s.frameV[i] = 0;
        paint(i);
      }
      return;
    }
    if (!s.raf) { s.last = 0; s.raf = requestAnimationFrame(step); }
  }, [paint, step]);

  const impulse = React.useCallback((i: number, amount: number) => {
    const s = sim.current;
    if (live.current.reduced || i < 0 || i >= live.current.count) return;
    s.vswing[i] = (s.vswing[i] ?? 0) + amount;
    kick();
  }, [kick]);

  const scrollTo = React.useCallback((x: number) => {
    const s = sim.current;
    s.goal = clamp(x, 0, s.max);
    s.sv = 0;
    if (live.current.reduced) { s.scroll = s.goal; s.goal = null; for (let i = 0; i < live.current.count; i++) s.tx[i] = (s.base[i] ?? 0) - s.scroll; }
    kick();
  }, [kick]);

  /** Geser rel supaya raket ini kelihatan utuh (autoplay & keyboard). */
  const reveal = React.useCallback((i: number) => {
    const { width, h, carousel } = live.current.size;
    if (carousel) return;
    const s = sim.current;
    const from = s.goal ?? s.scroll;
    const half = (h * DECK_ASPECT * (1 + RAIL_GAP)) / 2;
    const x = (s.base[i] ?? 0) - from;
    if (x - half < 0 || x + half > width) scrollTo((s.base[i] ?? 0) - width / 2);
  }, [scrollTo]);

  const page = (dir: 1 | -1) => {
    stop();
    const s = sim.current;
    const { width, h } = live.current.size;
    const pitch = h * DECK_ASPECT * (1 + RAIL_GAP);
    scrollTo((s.goal ?? s.scroll) + dir * Math.max(1, Math.floor(width / pitch) - 1) * pitch);
  };

  const choose = React.useCallback((index: number | null) => {
    const l = live.current;
    if (index === l.active || index === l.requested) return;
    l.requested = index;
    if (!l.controlled) { l.active = index; setInnerActive(index); }
    l.onActiveChange?.(index);
  }, []);

  const previous = React.useRef(null as number | null);
  React.useLayoutEffect(() => {
    const old = previous.current;
    live.current.requested = undefined;
    if (old === active) return;
    previous.current = active;
    if (active !== null) { impulse(active, 8); live.current.carouselIndex = active; }
  }, [active, impulse]);

  React.useLayoutEffect(() => {
    if (!size.width) return;
    const s = sim.current;
    const front = active;
    const xs = targets(size.h, size.width, size.carousel, front, active ?? live.current.carouselIndex);
    const fresh = s.x.length !== count;
    s.base = xs;
    s.max = size.carousel ? 0 : Math.max(0, (xs[count - 1] ?? 0) + (size.h * DECK_ASPECT * (1 + RAIL_GAP)) / 2 + EDGE - size.width);
    s.scroll = size.carousel ? 0 : s.pan ? s.scroll : clamp(s.scroll, 0, s.max);
    setMaxScroll(s.max);
    for (let i = 0; i < count; i++) {
      s.tx[i] = (xs[i] ?? 0) + (size.carousel ? pointer.current.swipe : -s.scroll);
      s.tturn[i] = i === front ? 0 : restAngle(i);
      if (fresh || reduced) {
        s.x[i] = s.tx[i] ?? 0; s.vx[i] = 0; s.frameX[i] = s.x[i] ?? 0; s.frameV[i] = 0; s.acc[i] = 0;
        s.turn[i] = s.tturn[i] ?? restAngle(i); s.vturn[i] = 0;
        s.swing[i] = s.swing[i] ?? 0; s.vswing[i] = s.vswing[i] ?? 0; s.tag[i] = 0; s.vtag[i] = 0;
      }
    }
    if (fresh) { s.x.length = count; for (let i = 0; i < count; i++) paint(i); }
    kick();
  }, [size, active, count, reduced, targets, paint, kick]);

  const brushed = React.useRef(false);
  React.useEffect(() => {
    if (!size.width || brushed.current || reduced) return;
    brushed.current = true;
    const timers = items.map((_, i) => window.setTimeout(() => impulse(i, 14), 90 + i * 60));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [size.width, reduced, items, impulse]);

  React.useEffect(() => () => { cancelAnimationFrame(sim.current.raf); sim.current.raf = 0; }, []);

  React.useLayoutEffect(() => {
    if (openIndex !== null || lifted !== null || returnFocus.current === null) return;
    const index = returnFocus.current;
    returnFocus.current = null;
    slots.current[index]?.focus({ preventScroll: true });
  }, [openIndex, lifted]);

  const stop = React.useCallback(() => setPlaying(false), []);

  React.useEffect(() => {
    if (!playing || reduced || openIndex !== null || count === 0 || !size.width) return;
    let timer = window.setTimeout(function advance() {
      const current = live.current.active;
      const next = current === null ? 0 : (current + 1) % live.current.count;
      choose(next);
      reveal(next);
      timer = window.setTimeout(advance, interval);
    }, active === null ? 1100 : interval);
    return () => window.clearTimeout(timer);
  }, [playing, reduced, openIndex, count, interval, size.width, choose, reveal, active]);

  const open = React.useCallback((index: number) => {
    stop();
    choose(index);
    setOpenIndex(index);
    live.current.onOpenChange?.(index);
  }, [choose, stop]);

  const source = React.useCallback(() => (openIndex === null ? null : turns.current[openIndex]?.getBoundingClientRect() ?? null), [openIndex]);
  const onLift = React.useCallback((lift: boolean) => setLifted(lift ? openIndex : null), [openIndex]);
  const onDetailClose = React.useCallback(() => {
    const index = openIndex;
    if (index === null) return;
    returnFocus.current = index;
    setOpenIndex(null);
    live.current.onOpenChange?.(null);
    impulse(index, (index % 2 ? 1 : -1) * 40);
  }, [openIndex, impulse]);

  function nearest(clientX: number, clientY: number) {
    const stage = stageRef.current;
    if (!stage) return null;
    const box = stage.getBoundingClientRect();
    const x = clientX - box.left;
    const y = clientY - box.top;
    const { h } = live.current.size;
    const g = stageGeometry(h);
    if (y < g.railY - 10 || y > g.height) return null;
    const s = sim.current;
    let best = null as number | null;
    let distance = Infinity;
    for (let i = 0; i < live.current.count; i++) {
      const half = footprint(h, progress(s.turn[i] ?? 0, i)) / 2 + 4;
      const d = Math.abs(x - (s.x[i] ?? 0));
      if (d < half && d < distance) { best = i; distance = d; }
    }
    return best;
  }

  const onPointerMove = (event: React.PointerEvent) => {
    const p = pointer.current;
    const s = sim.current;
    const stage = stageRef.current;
    if (p.id === event.pointerId && stage) {
      const dx = event.clientX - p.x;
      const now = performance.now();
      if (!p.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(event.clientY - p.y)) {
        p.moved = true;
        stop();
        if (stage.isConnected) stage.setPointerCapture(event.pointerId);
      }
      if (p.moved) {
        const v = (event.clientX - p.lastX) / Math.max(1, now - p.lastT);
        p.v = p.v * 0.6 + v * 0.4;
        p.lastX = event.clientX; p.lastT = now;
        if (!live.current.size.carousel) {
          if (!s.pan) { s.pan = true; s.goal = null; p.swipe = s.scroll + dx; choose(null); }
          const raw = p.swipe - dx;
          const edge = clamp(raw, 0, s.max);
          s.scroll = edge + (raw - edge) * 0.35; // lewat ujung: terasa ditahan
          kick();
        } else {
          p.swipe = dx;
          const xs = targets(live.current.size.h, live.current.size.width, true, live.current.active, live.current.active ?? live.current.carouselIndex);
          for (let i = 0; i < live.current.count; i++) s.tx[i] = (xs[i] ?? 0) + dx;
          kick();
        }
      }
      return;
    }
    if (event.pointerType !== "mouse" || live.current.size.carousel || live.current.openIndex !== null) return;
    const hit = nearest(event.clientX, event.clientY);
    const current = live.current.active;
    if (current !== null && hit !== current) {
      const box = stage?.getBoundingClientRect();
      const keep = box ? Math.abs(event.clientX - box.left - (s.x[current] ?? 0)) < footprint(live.current.size.h, 1) / 2 + 10 : false;
      if (keep && hit === null) return;
    }
    if (hit !== null) { stop(); choose(hit); }
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    const hit = nearest(event.clientX, event.clientY);
    const now = performance.now();
    pendingOpen.current = -1;
    sim.current.sv = 0; // sentuh = berhenti meluncur
    pointer.current = { id: event.pointerId, index: hit ?? -1, x: event.clientX, y: event.clientY, moved: false, kind: event.pointerType, swipe: 0, lastX: event.clientX, lastT: now, v: 0 };
  };

  const finishPointer = (event: React.PointerEvent, cancelled: boolean) => {
    const p = pointer.current;
    if (p.id !== event.pointerId) return;
    const s = sim.current;
    const stage = stageRef.current;
    if (stage?.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    pointer.current = { ...p, id: -1 };
    if (s.pan) {
      s.pan = false;
      pointer.current.swipe = 0;
      // meluncur hanya kalau tangan masih bergerak saat dilepas
      s.sv = live.current.reduced ? 0 : clamp(-p.v * 1000, -2600, 2600) * clamp(1 - (performance.now() - p.lastT) / 120, 0, 1);
      if (live.current.reduced) s.scroll = clamp(s.scroll, 0, s.max);
      kick();
      return;
    }
    if (p.moved && live.current.size.carousel) {
      const dx = event.clientX - p.x;
      const current = live.current.active ?? live.current.carouselIndex;
      const advance = Math.abs(dx) > 40 || Math.abs(p.v) > 0.45 ? (dx < 0 ? 1 : -1) : 0;
      pointer.current.swipe = 0;
      choose(clamp(current + advance, 0, live.current.count - 1));
      for (let i = 0; i < live.current.count; i++) impulse(i, clamp(-p.v * 22, -30, 30));
      return;
    }
    if (cancelled || p.moved || p.index < 0) return;
    stop();
    const touch = p.kind !== "mouse";
    if (touch && live.current.active !== p.index) choose(p.index);
    else pendingOpen.current = p.index;
  };

  // geser dua jari di trackpad (non-passive supaya browser tidak "back")
  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      const s = sim.current;
      if (live.current.size.carousel || s.max <= 0 || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      stop();
      s.goal = null;
      s.sv = 0;
      s.scroll = clamp(s.scroll + event.deltaX, 0, s.max);
      kick();
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [kick, stop]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key) || count === 0) return;
    event.preventDefault();
    stop();
    const from = active ?? focusIndex;
    const next = event.key === "Home" ? 0 : event.key === "End" ? count - 1 : clamp(from + (event.key === "ArrowRight" ? 1 : -1), 0, count - 1);
    setFocusIndex(next);
    choose(next);
    reveal(next);
    slots.current[next]?.focus({ preventScroll: true });
  };

  const current = active === null ? null : items[active];
  const hook = hookGeometry(size.h);

  return (
    <section
      {...rest}
      data-slot="skate-deck-rail"
      data-mode={size.carousel ? "carousel" : "rail"}
      data-active={active ?? ""}
      className={`relative isolate w-full overflow-hidden bg-background text-foreground [--rail-ink:var(--color-foreground)] ${className ?? ""}`}
    >
      <Defs uid={uid} h={size.h} />
      {(eyebrow || heading) && (
        <header className="relative z-10 flex flex-col items-center gap-2 px-6 pt-7 text-center">
          {eyebrow && <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">{eyebrow}</p>}
          {heading && <h2 className="text-balance text-2xl font-medium tracking-tight md:text-3xl">{heading}</h2>}
        </header>
      )}

      <div
        ref={stageRef}
        data-stage
        role="group"
        aria-roledescription="rak raket"
        aria-label={heading ?? "Rak raket"}
        className="relative mt-6 w-full cursor-grab touch-pan-y select-none active:cursor-grabbing"
        style={{ height: geo.height, overflowX: "clip" }}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerUp={(event) => finishPointer(event, false)}
        onPointerCancel={(event) => finishPointer(event, true)}
        onPointerLeave={(event) => { if (event.pointerType === "mouse" && pointer.current.id < 0 && !live.current.size.carousel && !document.activeElement?.matches("[data-deck]:focus-visible")) choose(null); }}
        onKeyDown={onKeyDown}
      >
        <div aria-hidden="true" data-rail className={`pointer-events-none absolute z-[5] ${size.carousel || maxScroll > 0 ? "-inset-x-3" : "inset-x-4"}`} style={{ top: geo.railY - geo.railT / 2, height: geo.railT }}>
          <div className="absolute inset-x-3 h-3 rounded-full bg-black/15 blur-[5px]" style={{ top: geo.railT + 1 }} />
          <div className="absolute inset-0 rounded-full" style={{ background: RAIL_GRADIENT, boxShadow: "0 1px 0 color-mix(in oklab, var(--color-foreground) 14%, transparent)" }} />
          <svg aria-hidden="true" className="absolute inset-0 size-full rounded-full opacity-25 mix-blend-overlay" preserveAspectRatio="none">
            <rect width="100%" height="100%" filter={`url(#${uid}-powder)`} />
          </svg>
          <div className="absolute inset-x-2 top-[20%] h-px rounded-full bg-white/35" />
          {!size.carousel && maxScroll <= 0 && [0, 1].map((side) => (
            <div key={side} className="absolute top-1/2 w-3.5 -translate-y-1/2 rounded-[3px]" style={{ [side ? "right" : "left"]: 8, height: geo.railT * 2.8, background: BRACKET_GRADIENT, boxShadow: "0 3px 6px color-mix(in oklab, black 22%, transparent)" }}>
              <span className="absolute left-1/2 top-1 size-1 -translate-x-1/2 rounded-full bg-white/30" />
              <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-white/30" />
            </div>
          ))}
        </div>

        {items.map((item, i) => {
          const fallback = !!failed[item.id];
          const mask = fallback ? FALLBACK_MASK : `url("${item.image}")`;
          const facing = active === i;
          return (
            <button
              key={item.id}
              ref={(node) => { slots.current[i] = node; }}
              type="button"
              data-deck={i}
              data-front={facing || undefined}
              tabIndex={i === (active ?? focusIndex) ? 0 : -1}
              aria-label={item.name}
              aria-describedby={`${uid}-caption`}
              aria-pressed={facing}
              className="group absolute left-0 cursor-pointer rounded-lg outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              style={{ top: geo.top, width: w, height: size.h, zIndex: facing ? 30 : 10 + i, transform: `translate3d(${((sim.current.x[i] ?? 0) - w / 2).toFixed(2)}px,0,0)` }}
              onFocus={() => { setFocusIndex(i); if (pointer.current.id < 0) { stop(); choose(i); reveal(i); } }}
              onClick={(event) => { const pending = pendingOpen.current; pendingOpen.current = -1; if (event.detail === 0 || pending === i) open(i); }}
            >
              <span ref={(node) => { hangs.current[i] = node; }} data-hang className="absolute inset-0" style={{ transformOrigin: `calc(50% + ${hook.pivotX.toFixed(2)}px) ${hook.pivotY.toFixed(2)}px` }}>
                <Hook uid={uid} h={size.h} part="back" />
                <span ref={(node) => { swings.current[i] = node; }} data-swing className="absolute inset-0" style={{ transformOrigin: `50% ${HOLE_Y * 100}%`, visibility: lifted === i ? "hidden" : undefined }}>
                  <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ filter: `blur(${Math.max(2, size.h * 0.008).toFixed(1)}px)` }}>
                    <span ref={(node) => { nears.current[i] = node; }} data-shadow="near" className="absolute inset-0 block bg-black/25" style={maskStyle(mask, fallback)} />
                  </span>
                  <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ filter: `blur(${Math.max(6, size.h * 0.03).toFixed(1)}px)` }}>
                    <span ref={(node) => { fars.current[i] = node; }} data-shadow="far" className="absolute inset-0 block bg-black/20 opacity-0" style={maskStyle(mask, fallback)} />
                  </span>
                  <span ref={(node) => { turns.current[i] = node; }} data-turn className="absolute inset-0" style={{ transformOrigin: `50% ${HOLE_Y * 100}%`, transform: `perspective(${PERSPECTIVE}px) rotateY(${restAngle(i)}deg)` }}>
                    {fallback
                      ? <FallbackArt tone={i} />
                      : <img src={item.image} alt="" draggable={false} decoding="async" onError={() => setFailed((old) => (old[item.id] ? old : { ...old, [item.id]: true }))} className="pointer-events-none absolute inset-0 size-full select-none object-contain" />}
                    <span ref={(node) => { shades.current[i] = node; }} aria-hidden="true" data-shade className="pointer-events-none absolute inset-0" style={{ ...maskStyle(mask, fallback), background: REST_SHADE }} />
                    <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" style={maskStyle(mask, fallback)}>
                      <span ref={(node) => { glints.current[i] = node; }} className="absolute inset-y-0 left-0 w-[70%] opacity-0" style={{ background: "linear-gradient(90deg, transparent, color-mix(in oklab, white 55%, transparent) 50%, transparent)" }} />
                    </span>
                  </span>
                </span>
                <Hook uid={uid} h={size.h} part="front" />
              </span>
              <span className={`pointer-events-none absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-center transition-opacity duration-300 motion-reduce:transition-none ${size.carousel && carouselIndex !== i ? "opacity-0" : ""}`} style={{ top: size.h * (1 + FOOT) + 4, width: size.carousel ? Math.min(280, size.width - 48) : w * 1.4 }}>
                <span className="text-sm font-medium leading-tight">{item.name}</span>
                {item.tag && <span className={`text-[13px] tabular-nums transition-colors duration-300 ${facing ? "font-semibold text-primary" : "text-muted-foreground"}`}>{item.tag}</span>}
              </span>
            </button>
          );
        })}
      </div>

      {size.carousel && count > 1 && (
        <div className="relative z-10 flex justify-center gap-1.5" role="group" aria-label={heading ?? "Rak raket"}>
          {items.map((item, i) => (
            <button key={item.id} type="button" tabIndex={-1} aria-label={item.name} aria-current={carouselIndex === i} onClick={() => { stop(); choose(i); }} className={`h-1.5 rounded-full outline-none transition-[width,background-color] duration-300 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${carouselIndex === i ? "w-6 bg-foreground" : "w-1.5 bg-black/25 hover:bg-black/45"}`} />
          ))}
        </div>
      )}

      {!size.carousel && maxScroll > 0 && (
        <div className="relative z-10 flex justify-center gap-2 pt-2">
          {([-1, 1] as const).map((dir) => (
            <button key={dir} type="button" aria-label={dir < 0 ? "Geser ke kiri" : "Geser ke kanan"} onClick={() => page(dir)} className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-white outline-none transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">
              <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={dir < 0 ? "M10 3L5 8l5 5" : "M6 3l5 5-5 5"} /></svg>
            </button>
          ))}
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center gap-3 px-6 pb-7 pt-3 text-center">
        <div id={`${uid}-caption`} className="text-[13px] text-muted-foreground">{caption}</div>
        <p aria-live="polite" className="sr-only">{current?.name}</p>
        {action}
      </div>

      {openIndex !== null && items[openIndex] && (
        <Detail
          uid={uid}
          item={items[openIndex]}
          index={openIndex}
          total={count}
          labels={labels}
          reduced={reduced}
          fallback={!!failed[items[openIndex].id]}
          extra={detailAction?.(items[openIndex], openIndex)}
          source={source}
          onLift={onLift}
          onClose={onDetailClose}
        />
      )}
    </section>
  );
}

function Detail({ uid, item, index, total, labels, reduced, fallback, extra, source, onLift, onClose }: {
  uid: string;
  item: SkateDeck;
  index: number;
  total: number;
  labels: SkateDeckRailLabels;
  reduced: boolean;
  fallback: boolean;
  extra: React.ReactNode;
  source: () => DOMRect | null;
  onLift: (lifted: boolean) => void;
  onClose: () => void;
}) {
  const dialogRef = React.useRef(null as HTMLDivElement | null);
  const figureRef = React.useRef(null as HTMLDivElement | null);
  const closeRef = React.useRef(null as HTMLButtonElement | null);
  const [shown, setShown] = React.useState(false);
  const closing = React.useRef(false);
  const titleId = `${uid}-deck-title`;
  const mask = fallback ? FALLBACK_MASK : `url("${item.image}")`;

  React.useLayoutEffect(() => {
    const figure = figureRef.current;
    const from = source();
    closeRef.current?.focus({ preventScroll: true });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let animation = null as Animation | null;
    if (figure && from && !reduced && from.width > 0) {
      const to = figure.getBoundingClientRect();
      const scale = from.height / to.height;
      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top - to.top;
      const lift = Math.min(90, Math.abs(dy) * 0.25 + 30);
      onLift(true);
      animation = figure.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
        { transform: `translate(${dx * 0.4}px, ${dy * 0.4 - lift}px) scale(${((scale + 1) / 2) * 1.03}) rotate(${dx > 0 ? -3 : 3}deg)`, offset: 0.5 },
        { transform: "none" },
      ], { duration: 680, easing: "cubic-bezier(.22,.85,.3,1)" });
    }
    const raf = requestAnimationFrame(() => setShown(true));
    return () => {
      cancelAnimationFrame(raf);
      animation?.cancel();
      document.body.style.overflow = overflow;
      onLift(false);
    };
  }, [source, reduced, onLift]);

  const dismiss = React.useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setShown(false);
    const figure = figureRef.current;
    const to = source();
    if (!figure || !to || reduced || to.width === 0) { onClose(); return; }
    const from = figure.getBoundingClientRect();
    const scale = to.height / from.height;
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top - from.top;
    const animation = figure.animate([
      { transform: "none" },
      { transform: `translate(${dx * 0.6}px, ${dy * 0.6 - 30}px) scale(${(scale + 1) / 2})`, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
    ], { duration: 560, easing: "cubic-bezier(.45,0,.55,1)", fill: "forwards" });
    animation.onfinish = () => onClose();
  }, [source, reduced, onClose]);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (!dialog || dialog.contains(event.target as Node)) return;
      if (event.key === "Escape") { event.preventDefault(); dismiss(); }
      else if (event.key === "Tab") { const first = dialog.querySelector("button"); if (first) { event.preventDefault(); first.focus(); } }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dismiss]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") { event.preventDefault(); dismiss(); return; }
    if (event.key !== "Tab") return;
    const controls = [...(dialogRef.current?.querySelectorAll("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])") ?? [])].filter((node) => !(node as HTMLButtonElement).disabled) as HTMLElement[];
    const first = controls[0];
    const last = controls.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  return createPortal(
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} data-deck-detail className="fixed inset-0 z-50 flex justify-center overflow-y-auto p-4 text-foreground sm:p-8" onKeyDown={onKeyDown}>
      <div aria-hidden="true" className={`fixed inset-0 bg-black/20 transition-opacity duration-300 motion-reduce:transition-none ${shown ? "opacity-100" : "opacity-0"}`} onClick={dismiss} />
      <div className="relative my-auto grid w-full max-w-3xl items-center justify-items-center gap-5 px-6 pb-7 pt-8 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-12 sm:px-14 sm:py-10">
        {/* kaca dipisah jadi lapisan sendiri: raket tetap bebas terbang dari rel ke popup */}
        <div
          aria-hidden="true"
          data-glass
          className={`absolute inset-0 overflow-hidden rounded-[32px] border border-white/70 transition-[opacity,transform] duration-300 motion-reduce:transition-none ${shown ? "scale-100 opacity-100" : "scale-[0.96] opacity-0"}`}
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.5) 45%, rgba(255,255,255,0.62))",
            backdropFilter: "blur(22px) saturate(180%)",
            WebkitBackdropFilter: "blur(22px) saturate(180%)",
            boxShadow: "0 30px 80px rgba(0,0,0,0.28), 0 4px 14px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.95), inset 1px 0 1px rgba(255,255,255,0.6), inset 0 -1px 2px rgba(255,255,255,0.55), inset 0 0 28px rgba(255,255,255,0.35)",
          }}
        >
          <div className="absolute inset-x-0 top-0 h-1/3" style={{ background: "radial-gradient(75% 100% at 22% 0%, rgba(255,255,255,0.75), transparent 70%)" }} />
        </div>
        <button ref={closeRef} type="button" aria-label={labels.close} onClick={dismiss} className={`absolute right-4 top-4 z-10 inline-flex size-10 items-center justify-center rounded-full border border-white/70 bg-white/55 text-foreground shadow-sm outline-none transition-[opacity,background-color] duration-300 hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none ${shown ? "opacity-100" : "opacity-0"}`}>
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 3l10 10M13 3L3 13" /></svg>
        </button>
        <div ref={figureRef} data-figure className="relative h-[40svh] origin-top sm:h-[min(62svh,520px)]" style={{ aspectRatio: DECK_ASPECT }}>
          <span aria-hidden="true" className="absolute inset-0 translate-x-[6%] translate-y-[2%] blur-lg">
            <span className="absolute inset-0 bg-black/25" style={maskStyle(mask, fallback)} />
          </span>
          {fallback ? <FallbackArt tone={index} /> : <img src={item.image} alt={item.name} draggable={false} className="pointer-events-none absolute inset-0 size-full select-none object-contain" />}
        </div>
        <div className={`relative flex w-full min-w-0 flex-col items-start gap-3 transition-[opacity,transform] delay-150 duration-500 motion-reduce:transition-none ${shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
          <p className="font-mono text-[11px] tracking-[0.2em] text-zinc-700">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}{item.series ? ` · ${item.series}` : ""}
          </p>
          <h3 id={titleId} className="text-balance text-xl font-medium tracking-tight sm:text-3xl">{item.name}</h3>
          {item.variants && item.variants.length > 0 && (
            <ul aria-label="Varian" className="flex flex-wrap gap-1.5">
              {item.variants.map((v) => (
                <li key={v.label} className={`rounded-full border border-white/80 px-3 py-1.5 text-xs ${v.sold ? "bg-white/25 text-zinc-500 line-through" : "bg-white/65 text-zinc-900"}`}>
                  {v.label}{v.sold && <span className="sr-only"> (habis)</span>}
                </li>
              ))}
            </ul>
          )}
          {(item.tag || item.width) && (
            <div className="flex flex-wrap items-baseline gap-3">
              {item.tag && <span className="text-lg font-semibold tabular-nums">{item.tag}</span>}
              {item.width && <span className="rounded-md border border-border px-2 py-0.5 font-mono text-xs text-zinc-700">{item.width}</span>}
            </div>
          )}
          {item.description && <p className="text-sm leading-relaxed text-zinc-700">{item.description}</p>}
          {item.details && item.details.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {item.details.map((detail) => <li key={detail} className="rounded-full border border-white/80 bg-white/55 px-2.5 py-1 text-[11px] text-zinc-700">{detail}</li>)}
            </ul>
          )}
          {extra && <div className="mt-1">{extra}</div>}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default SkateDeckRail;
