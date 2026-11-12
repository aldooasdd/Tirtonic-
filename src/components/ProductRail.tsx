"use client";

import { useRef } from "react";

// Carousel horizontal (scroll-snap native) + tombol geser.
export default function ProductRail({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const go = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: "smooth" });
  const btn = "ev-pill absolute top-[38%] z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-neutral-800 transition hover:bg-white sm:grid";
  return (
    <div className="relative">
      <div ref={ref} className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-4 pt-1 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
      <button type="button" onClick={() => go(-1)} aria-label="Sebelumnya" className={`${btn} -left-3`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
      </button>
      <button type="button" onClick={() => go(1)} aria-label="Berikutnya" className={`${btn} -right-3`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
      </button>
    </div>
  );
}
