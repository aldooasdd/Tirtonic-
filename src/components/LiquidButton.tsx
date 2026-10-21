"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Tombol liquid glass: rim shadow + distorsi backdrop via SVG #container-glass.
// Tanpa dependency shadcn/cva — adaptasi pola yang sudah dipakai di landing.
export function LiquidButton({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "relative inline-flex h-12 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full px-8 text-sm font-semibold transition-transform duration-300 hover:scale-105 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {/* rim highlight/shadow (light + dark) */}
      <span
        aria-hidden
        className="absolute inset-0 z-0 rounded-full shadow-[0_0_6px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3px_rgba(0,0,0,0.9),inset_-3px_-3px_0.5px_-3px_rgba(0,0,0,0.85),inset_1px_1px_1px_-0.5px_rgba(0,0,0,0.6),inset_-1px_-1px_1px_-0.5px_rgba(0,0,0,0.6),inset_0_0_6px_6px_rgba(0,0,0,0.12),inset_0_0_2px_2px_rgba(0,0,0,0.06),0_0_12px_rgba(255,255,255,0.15)]"
      />
      {/* distorsi backdrop */}
      <span aria-hidden className="absolute inset-0 -z-10 overflow-hidden rounded-full" style={{ backdropFilter: 'url("#container-glass")' }} />
      <span className="pointer-events-none z-10">{children}</span>
      <GlassFilter />
    </button>
  );
}

// Filter distorsi (dipakai via backdropFilter: url(#container-glass)). Aman kalau
// id-nya sama dengan yang di landing — definisinya identik.
function GlassFilter() {
  return (
    <svg className="hidden">
      <defs>
        <filter id="container-glass" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.05 0.05" numOctaves="1" seed="1" result="turbulence" />
          <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />
          <feDisplacementMap in="SourceGraphic" in2="blurredNoise" scale="70" xChannelSelector="R" yChannelSelector="B" result="displaced" />
          <feGaussianBlur in="displaced" stdDeviation="4" result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}
