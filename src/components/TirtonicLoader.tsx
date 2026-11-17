"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";

// Bola mantul dari logo animasi halaman Contact (/logo-animation.json): ambil layer bolanya saja
// ("p2 copy Outlines"), buang tulisan, lalu crop komposisi 1920×1080 ke area lintasan bola.
let cache: Promise<object | null> | null = null;
function loadBall() {
  cache ??= fetch("/logo-animation.json")
    .then((r) => r.json())
    .then((d) => {
      const ball = d.layers.find((l: { nm: string }) => l.nm.startsWith("p2"));
      const DX = 913, DY = 50; // geser bola ke pojok kanvas crop
      for (const k of ball.ks.p.k) { k.s[0] -= DX; k.s[1] -= DY; }
      return { ...d, w: 280, h: 530, layers: [ball] };
    })
    .catch(() => (cache = null));
  return cache;
}

function Ball({ size }: { size: number }) {
  const [data, setData] = useState<object | null>(null);
  useEffect(() => {
    let alive = true;
    loadBall()?.then((d) => alive && d && setData(d));
    return () => { alive = false; };
  }, []);
  return (
    <div style={{ width: size * 0.53, height: size }} aria-label="Memuat Tirtonic" role="img">
      {data && <Lottie animationData={data} loop className="h-full w-full" />}
    </div>
  );
}

/** Loading antar halaman: bola Tirtonic mantul-mantul. */
export default function TirtonicLoader({ className = "" }: { className?: string; background?: string }) {
  return (
    <div className={`flex w-full items-center justify-center bg-white ${className}`}>
      <Ball size={120} />
    </div>
  );
}

/** Splash layar penuh sekali per sesi, ±1,5 dtk. Ketuk untuk lewati. */
export function TirtonicSplash() {
  const [show, setShow] = useState(false);
  const [fade, setFade] = useState(false);
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem("tt_splash") === "1"; sessionStorage.setItem("tt_splash", "1"); } catch {}
    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setShow(true);
    let t1: ReturnType<typeof setTimeout>, t2: ReturnType<typeof setTimeout>;
    let alive = true;
    loadBall()?.then(() => {
      if (!alive) return;
      t1 = setTimeout(() => setFade(true), 1000); // 1 pantulan (1 dtk) lalu langsung ke halaman
      t2 = setTimeout(() => setShow(false), 1200);
    });
    return () => { alive = false; clearTimeout(t1); clearTimeout(t2); };
  }, []);
  if (!show) return null;
  return (
    <div
      onClick={() => { setFade(true); setTimeout(() => setShow(false), 200); }}
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-white transition-opacity duration-200 ${fade ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      <Ball size={140} />
    </div>
  );
}

/** Ambil animasi bola lebih dulu saat browser senggang. */
export function TirtonicLoaderWarmup() {
  useEffect(() => {
    const run = () => void loadBall();
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(run);
    else setTimeout(run, 800);
  }, []);
  return null;
}
