"use client";

import * as React from "react";
import { BRACKET_GRADIENT, Defs, Detail, HOLE_Y, Hook, RAIL_GRADIENT, hookGeometry, railThickness, type SkateDeck } from "./skate-deck-rail";

const HOOK_H = 430; // skala kait & rel = skala rak raket
const ASPECT = 2; // kanvas sepatu 2:1, sol menempel di tepi bawah
const RAIL_Y = 26;
const K = 22; // pegas ayunan
const DAMP = 2;
const LIMIT = 5; // derajat: sepatu lebih berat dari raket
const LABELS = { close: "Tutup", open: "Lihat" };

/** Rel sepatu: tiap sepatu duduk di ayunan papan kayu bertali segitiga. Geser = scroll asli browser. */
export default function ShoeSwingRail({ items, heading, caption, detailAction }: { items: SkateDeck[]; heading?: string; caption?: string; detailAction?: (item: SkateDeck) => React.ReactNode }) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const view = React.useRef<HTMLDivElement>(null);
  const swings = React.useRef<(HTMLSpanElement | null)[]>([]);
  const shoes = React.useRef<(HTMLSpanElement | null)[]>([]);
  const buttons = React.useRef<(HTMLButtonElement | null)[]>([]);
  const sim = React.useRef({ a: [] as number[], v: [] as number[], left: -1, last: 0, raf: 0 });
  const drag = React.useRef({ on: false, x: 0, left: 0, moved: false });
  const [w, setW] = React.useState(300); // lebar sepatu
  const [over, setOver] = React.useState(false);
  const [open, setOpen] = React.useState<number | null>(null);
  const [lifted, setLifted] = React.useState<number | null>(null);
  const [reduced, setReduced] = React.useState(false);

  const step = React.useCallback((now: number) => {
    const s = sim.current;
    const dt = Math.min(0.05, s.last ? (now - s.last) / 1000 : 1 / 60);
    s.last = now;
    const left = view.current?.scrollLeft ?? 0;
    const dx = s.left < 0 ? 0 : left - s.left;
    s.left = left;
    let moving = Math.abs(dx) > 0.2;
    swings.current.forEach((el, i) => {
      let v = (s.v[i] ?? 0) + Math.max(-40, Math.min(40, dx)) * 0.12 * (1 + (i % 3) * 0.12);
      let a = s.a[i] ?? 0;
      v += (-K * a - DAMP * v) * dt;
      a += v * dt;
      if (Math.abs(a) > LIMIT) { a = Math.sign(a) * LIMIT; v *= 0.5; }
      s.a[i] = a;
      s.v[i] = v;
      if (Math.abs(a) > 0.02 || Math.abs(v) > 0.05) moving = true;
      else s.a[i] = 0;
      if (el) el.style.transform = `rotate(${(s.a[i] ?? 0).toFixed(3)}deg)`;
    });
    s.raf = moving ? requestAnimationFrame(step) : 0;
    if (!moving) s.last = 0;
  }, []);
  const kick = React.useCallback(() => {
    if (!reduced && !sim.current.raf) sim.current.raf = requestAnimationFrame(step);
  }, [reduced, step]);
  const push = React.useCallback((i: number, v: number) => { sim.current.v[i] = (sim.current.v[i] ?? 0) + v; kick(); }, [kick]);

  React.useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const f = () => setReduced(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);

  React.useLayoutEffect(() => {
    const el = view.current;
    if (!el) return;
    const measure = () => {
      setW(Math.round(el.clientWidth < 640 ? Math.min(300, el.clientWidth * 0.62) : Math.max(230, Math.min(290, el.clientWidth * 0.2))));
      setOver(el.scrollWidth > el.clientWidth + 1);
    };
    measure();
    const o = new ResizeObserver(measure);
    o.observe(el);
    if (el.firstElementChild) o.observe(el.firstElementChild);
    return () => o.disconnect();
  }, [items.length]);

  // mulai dari sepatu tengah
  React.useLayoutEffect(() => {
    const el = view.current;
    const b = buttons.current[Math.floor(items.length / 2)];
    if (!el || !b) return;
    el.scrollLeft += b.getBoundingClientRect().left + b.offsetWidth / 2 - el.getBoundingClientRect().left - el.clientWidth / 2;
    sim.current.left = el.scrollLeft;
  }, [w, items.length]);

  React.useEffect(() => {
    items.forEach((_, i) => push(i, 5 + (i % 2) * 2));
    const s = sim.current;
    return () => { cancelAnimationFrame(s.raf); s.raf = 0; };
  }, [items, push]);

  const source = React.useCallback(() => (open === null ? null : shoes.current[open]?.getBoundingClientRect() ?? null), [open]);
  const onLift = React.useCallback((on: boolean) => setLifted(on ? open : null), [open]);
  const onClose = React.useCallback(() => {
    if (open === null) return;
    const i = open;
    setOpen(null);
    push(i, 9);
    requestAnimationFrame(() => buttons.current[i]?.focus({ preventScroll: true }));
  }, [open, push]);

  // geometri satu ayunan (px)
  const g = hookGeometry(HOOK_H);
  const railT = railThickness(HOOK_H);
  const cell = w * 1.27;
  const apexX = cell / 2 + g.rc * 0.6;
  const apexY = HOLE_Y * HOOK_H + HOOK_H * 0.0095;
  const boardY = apexY + w * 0.86; // permukaan papan
  const boardW = w * 1.16;
  const x0 = apexX - boardW / 2;
  const x1 = apexX + boardW / 2;
  const depth = w * 0.06; // permukaan atas papan (kedalaman)
  const thick = Math.max(9, w * 0.042);
  const inset = w * 0.055;
  const eye = boardY + depth * 0.5;
  const slotTop = RAIL_Y - g.pivotY;
  const art = { w: cell, h: boardY + depth + thick + 4 };

  return (
    <section data-shoe-rail className="relative w-full overflow-hidden bg-background pb-8 text-foreground [--rail-ink:var(--color-foreground)]">
      <Defs uid={uid} h={HOOK_H} />
      {heading && <h2 className="px-6 pt-7 text-center text-2xl font-medium tracking-tight md:text-3xl">{heading}</h2>}
      <div className="relative mt-6">
        <div aria-hidden="true" className={`pointer-events-none absolute ${over ? "-inset-x-3" : "inset-x-4"}`} style={{ top: RAIL_Y - railT / 2, height: railT }}>
          <div className="absolute inset-x-3 h-3 rounded-full bg-black/15 blur-[5px]" style={{ top: railT + 1 }} />
          <div className="absolute inset-0 rounded-full" style={{ background: RAIL_GRADIENT }} />
          <div className="absolute inset-x-2 top-[20%] h-px rounded-full bg-white/35" />
          {!over && [0, 1].map((side) => (
            <div key={side} className="absolute top-1/2 w-3.5 -translate-y-1/2 rounded-[3px]" style={{ [side ? "right" : "left"]: 8, height: railT * 2.8, background: BRACKET_GRADIENT, boxShadow: "0 3px 6px rgba(0,0,0,.22)" }} />
          ))}
        </div>
        <div
          ref={view}
          role="group"
          aria-label={heading ?? "Rak sepatu"}
          className="relative snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] sm:snap-none [&::-webkit-scrollbar]:hidden"
          onScroll={kick}
          onPointerDown={(e) => { if (e.pointerType === "mouse" && e.button === 0) drag.current = { on: true, x: e.clientX, left: view.current!.scrollLeft, moved: false }; }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d.on) return;
            if (!(e.buttons & 1)) { d.on = false; return; }
            if (Math.abs(e.clientX - d.x) > 5) d.moved = true;
            if (d.moved) view.current!.scrollLeft = d.left - (e.clientX - d.x);
          }}
          onPointerUp={() => { drag.current.on = false; }}
          onPointerLeave={() => { drag.current.on = false; }}
          onClickCapture={(e) => { if (drag.current.moved) { e.preventDefault(); e.stopPropagation(); drag.current.moved = false; } }}
          onDragStart={(e) => e.preventDefault()}
        >
          <div className="mx-auto flex w-max" style={{ paddingInline: `max(0px, calc(50% - ${cell / 2}px))` }}>
            {items.map((item, i) => (
              <button
                key={item.id}
                ref={(n) => { buttons.current[i] = n; }}
                type="button"
                data-shoe={i}
                aria-label={item.name}
                onClick={() => setOpen(i)}
                onPointerEnter={(e) => { if (e.pointerType === "mouse") push(i, i % 2 ? 4 : -4); }}
                className="group relative shrink-0 cursor-pointer snap-center rounded-lg outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring"
                style={{ width: cell, height: slotTop + art.h + 92 }}
              >
                <span ref={(n) => { swings.current[i] = n; }} className="absolute inset-x-0 block" style={{ top: slotTop, height: art.h, transformOrigin: `calc(50% + ${g.pivotX}px) ${g.pivotY}px` }}>
                  <Hook uid={uid} h={HOOK_H} part="back" />
                  <svg aria-hidden="true" width={art.w} height={art.h} className="absolute inset-0 overflow-visible">
                    <defs>
                      <linearGradient id={`${uid}-top`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#c69a68" /><stop offset="1" stopColor="#dfb988" /></linearGradient>
                      <linearGradient id={`${uid}-edge`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#b98651" /><stop offset="1" stopColor="#8a5c32" /></linearGradient>
                      <filter id={`${uid}-soft`} x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="5" /></filter>
                    </defs>
                    {/* bayangan ke dinding */}
                    <path d={`M${x0 + inset + 8},${eye + 10} L${apexX + 8},${apexY + 10} L${x1 - inset + 8},${eye + 10}`} fill="none" stroke="#000" strokeOpacity=".1" strokeWidth="2" />
                    <rect x={x0 + 10} y={boardY + depth + 12} width={boardW} height={thick} rx="6" fill="#000" fillOpacity=".22" filter={`url(#${uid}-soft)`} />
                    {/* kawat baja */}
                    {[["#6b7280", 2.6], ["#d9dce1", 1.1]].map(([c, t]) => (
                      <path key={c} d={`M${x0 + inset},${eye} L${apexX},${apexY} L${x1 - inset},${eye}`} fill="none" stroke={c as string} strokeWidth={t as number} strokeLinejoin="round" />
                    ))}
                    {/* papan kayu: permukaan atas + sisi depan */}
                    <path d={`M${x0 + depth * 0.9},${boardY} H${x1 - depth * 0.9} Q${x1 - depth * 0.3},${boardY} ${x1},${boardY + depth} H${x0} Q${x0 + depth * 0.3},${boardY} ${x0 + depth * 0.9},${boardY} Z`} fill={`url(#${uid}-top)`} />
                    <path d={`M${x0},${boardY + depth} H${x1} V${boardY + depth + thick - 5} Q${x1},${boardY + depth + thick} ${x1 - 5},${boardY + depth + thick} H${x0 + 5} Q${x0},${boardY + depth + thick} ${x0},${boardY + depth + thick - 5} Z`} fill={`url(#${uid}-edge)`} />
                    {[0.3, 0.55, 0.78].map((k, n) => (
                      <path key={k} d={`M${x0 + 6 + n * 14},${boardY + depth + thick * k} q${boardW * 0.25},${n % 2 ? 1.6 : -1.6} ${boardW * 0.5},0 t${boardW * 0.4 - n * 12},0`} fill="none" stroke="#6d4522" strokeOpacity=".35" strokeWidth=".8" />
                    ))}
                    <path d={`M${x0 + 2},${boardY + depth + 0.6} H${x1 - 2}`} stroke="#f3d7ad" strokeOpacity=".8" strokeWidth="1" />
                    {/* bayangan sol */}
                    <ellipse cx={apexX} cy={boardY + depth * 0.55} rx={w * 0.45} ry={depth * 0.34} fill="#3b2410" fillOpacity={lifted === i ? 0 : 0.5} filter={`url(#${uid}-soft)`} />
                    {/* mur kawat */}
                    {[x0 + inset, x1 - inset].map((x) => <g key={x}><ellipse cx={x} cy={eye} rx="4.4" ry="2.4" fill="#4b5563" /><ellipse cx={x - 0.6} cy={eye - 0.6} rx="2.4" ry="1.1" fill="#d1d5db" /></g>)}
                  </svg>
                  <span ref={(n) => { shoes.current[i] = n; }} className="absolute block transition-transform duration-300 ease-out group-hover:-translate-y-1 motion-reduce:transition-none" style={{ left: apexX - w / 2, top: boardY + depth * 0.62 - w / ASPECT, width: w, height: w / ASPECT, visibility: lifted === i ? "hidden" : undefined }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt="" loading="lazy" decoding="async" draggable={false} className="pointer-events-none size-full select-none object-contain object-bottom" />
                  </span>
                  <Hook uid={uid} h={HOOK_H} part="front" />
                </span>
                <span className="absolute inset-x-2 bottom-3 flex min-h-[44px] flex-col items-center gap-1 text-center">
                  <span className="text-sm font-medium leading-tight">{item.name}</span>
                  {item.tag && <span className="text-[13px] tabular-nums text-muted-foreground">{item.tag}</span>}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {over && (
        <div className="hidden justify-center gap-2 sm:flex">
          {([-1, 1] as const).map((dir) => (
            <button key={dir} type="button" aria-label={dir < 0 ? "Geser ke kiri" : "Geser ke kanan"} onClick={() => view.current?.scrollBy({ left: dir * cell, behavior: reduced ? "auto" : "smooth" })} className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-white outline-none transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary">
              <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={dir < 0 ? "M10 3L5 8l5 5" : "M6 3l5 5-5 5"} /></svg>
            </button>
          ))}
        </div>
      )}
      {caption && <p className="px-6 pt-4 text-center text-[13px] text-muted-foreground">{caption}</p>}
      {open !== null && items[open] && (
        <Detail uid={uid} item={items[open]} index={open} total={items.length} labels={LABELS} reduced={reduced} fallback={false} extra={detailAction?.(items[open])} source={source} onLift={onLift} onClose={onClose} wide={ASPECT} />
      )}
    </section>
  );
}
