"use client";

import { useEffect } from "react";
import { GlassIconReveal, preloadGlassLogo } from "@/components/ui/liquid-glass-logo-reveal";

const LOGO = "/logo.png";

/** Loading halaman: bola Tirtonic muncul dari tetesan kaca (liquid glass reveal).
 *  Logo statis langsung tampil di tengah; kanvas kaca menutupinya begitu mulai menggambar. */
export default function TirtonicLoader({ className = "", background = "#ffffff" }: { className?: string; background?: string }) {
  return (
    <div className={`relative w-full ${className}`} style={{ backgroundColor: background }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO} alt="" aria-hidden className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 animate-pulse object-contain" />
      <GlassIconReveal
        logo={LOGO}
        label="Memuat Tirtonic"
        originalColors
        background={background}
        tileSize={180}
        logoScale={0.6}
        finalScale={0.75}
        tuning={{ startZoom: 2.3 }}
        className="h-full w-full cursor-default"
        style={{ backgroundColor: "transparent" }}
      />
    </div>
  );
}

/** Dipasang di layout: olah logo saat browser senggang, jadi loader berikutnya langsung beranimasi. */
export function TirtonicLoaderWarmup() {
  useEffect(() => {
    const run = () => void preloadGlassLogo(LOGO);
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(run);
    else setTimeout(run, 1500);
  }, []);
  return null;
}
