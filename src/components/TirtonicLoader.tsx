"use client";

import { useEffect, useState } from "react";
import { GlassIconReveal, preloadGlassLogo } from "@/components/ui/liquid-glass-logo-reveal";

// Sama dengan demo GlassReveal21st (look light), logo diganti bola Tirtonic.
const DEMO = {
  logo: "/logo.png", // ikon bola Tirtonic (warna asli)
  label: "Tirtonic",
  look: "light" as const,
  originalColors: true,
  logoScale: 0.6,
  finalScale: 0.8,
  tuning: { startZoom: 2.3 },
};

/** Loading antar halaman. */
export default function TirtonicLoader({ className = "", background = "#e9e9eb" }: { className?: string; background?: string }) {
  return <GlassIconReveal {...DEMO} background={background} className={`w-full cursor-default ${className}`} />;
}

/** Splash layar penuh sekali per sesi: reveal penuh seperti demo sampai tuntas, lalu memudar ke halaman. Ketuk untuk lewati. */
export function TirtonicSplash() {
  const [show, setShow] = useState(false);
  const [fade, setFade] = useState(false);
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem("tt_splash") === "1"; sessionStorage.setItem("tt_splash", "1"); } catch {}
    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setShow(true);
    // Hitung mundur baru mulai setelah logo kaca siap → animasi selalu tuntas dulu, baru halaman terlihat.
    let t1: ReturnType<typeof setTimeout>, t2: ReturnType<typeof setTimeout>;
    let alive = true;
    preloadGlassLogo(DEMO.logo).then(() => {
      if (!alive) return;
      t1 = setTimeout(() => setFade(true), 3900); // reveal ±3,5 dtk (present 2,4 + tail 1,1) + jeda
      t2 = setTimeout(() => setShow(false), 4500);
    });
    return () => { alive = false; clearTimeout(t1); clearTimeout(t2); };
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
    const run = () => void preloadGlassLogo(DEMO.logo);
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(run);
    else setTimeout(run, 800);
  }, []);
  return null;
}
