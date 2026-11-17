"use client";

import { useEffect, useState } from "react";
import { GlassIconReveal, preloadGlassLogo } from "@/components/ui/liquid-glass-logo-reveal";

// Bola tenis vektor (lingkaran + 2 garis jahitan sebagai celah) — efek kaca butuh bentuk halus, bukan pixel art.
export const BALL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><mask id="m"><circle cx="50" cy="50" r="48" fill="#fff"/><path d="M17 13 C40 32 40 68 17 87" fill="none" stroke="#000" stroke-width="6" stroke-linecap="round"/><path d="M83 13 C60 32 60 68 83 87" fill="none" stroke="#000" stroke-width="6" stroke-linecap="round"/></mask></defs><circle cx="50" cy="50" r="48" fill="#fff" mask="url(#m)"/></svg>`;

// Sama dengan demo GlassReveal21st (look light), logo diganti bola Tirtonic.
const DEMO = {
  logo: BALL_SVG,
  label: "Tirtonic",
  look: "light" as const,
  logoColor: "#173f2f",
  logoScale: 0.6,
  finalScale: 0.8,
  tuning: { startZoom: 2.3 },
};

/** Loading antar halaman. */
export default function TirtonicLoader({ className = "", background = "#e9e9eb" }: { className?: string; background?: string }) {
  return <GlassIconReveal {...DEMO} background={background} className={`w-full cursor-default ${className}`} />;
}

/** Splash layar penuh sekali per sesi: reveal penuh seperti demo, lalu memudar. Ketuk untuk lewati. */
export function TirtonicSplash() {
  const [show, setShow] = useState(false);
  const [fade, setFade] = useState(false);
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem("tt_splash") === "1"; sessionStorage.setItem("tt_splash", "1"); } catch {}
    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setShow(true);
    const t1 = setTimeout(() => setFade(true), 3700); // reveal ±3,5 dtk (present 2,4 + tail 1,1)
    const t2 = setTimeout(() => setShow(false), 4300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  if (!show) return null;
  return (
    <div
      onClick={() => { setFade(true); setTimeout(() => setShow(false), 400); }}
      className={`fixed inset-0 z-[200] transition-opacity duration-500 ${fade ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      <GlassIconReveal {...DEMO} loop={false} background="#e9e9eb" className="h-svh min-h-[420px] w-full" />
    </div>
  );
}

/** Olah logo kaca saat browser senggang, jadi loader berikutnya langsung beranimasi. */
export function TirtonicLoaderWarmup() {
  useEffect(() => {
    const run = () => void preloadGlassLogo(BALL_SVG);
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(run);
    else setTimeout(run, 800);
  }, []);
  return null;
}
