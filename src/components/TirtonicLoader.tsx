"use client";

import { GlassIconReveal } from "@/components/ui/liquid-glass-logo-reveal";

/** Loading halaman: bola Tirtonic muncul dari tetesan kaca (liquid glass reveal). */
export default function TirtonicLoader({ className = "", background = "#ffffff" }: { className?: string; background?: string }) {
  return (
    <GlassIconReveal
      logo="/logo.png"
      label="Memuat Tirtonic"
      originalColors
      background={background}
      tileSize={180}
      logoScale={0.6}
      finalScale={0.75}
      tuning={{ startZoom: 2.3 }}
      className={`w-full cursor-default ${className}`}
    />
  );
}
