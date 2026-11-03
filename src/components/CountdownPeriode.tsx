"use client";

import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

// Countdown live ke akhir periode leaderboard — gaya box (stitch), dipakai di kartu
// gelap "Musim Berjalan". Detik dibedakan warna emas.
export default function CountdownPeriode({ deadline }: { deadline: string }) {
  const end = new Date(deadline).getTime();
  const [ms, setMs] = useState(() => end - Date.now());
  useEffect(() => {
    const t = setInterval(() => setMs(end - Date.now()), 1000);
    return () => clearInterval(t);
  }, [end]);

  if (ms <= 0) return <span className="text-[13px] font-bold text-white/80">Periode berakhir</span>;

  const parts = [
    { v: Math.floor(ms / 86400000), l: "days" },
    { v: Math.floor((ms % 86400000) / 3600000), l: "hrs" },
    { v: Math.floor((ms % 3600000) / 60000), l: "min" },
    { v: Math.floor((ms % 60000) / 1000), l: "sec", hot: true },
  ];

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {parts.map((p, i) => (
        <div key={p.l} className="flex items-center gap-1.5">
          <div className="flex flex-col items-center">
            <div className={`flex min-w-[34px] items-center justify-center rounded-lg border px-1.5 py-1 shadow-inner backdrop-blur-md ${p.hot ? "border-amber-300/40 bg-amber-400/20" : "border-white/20 bg-black/30"}`}>
              <span className={`text-[16px] font-bold leading-none tracking-tight tabular-nums ${p.hot ? "animate-pulse text-amber-300" : "text-white"}`}>{pad(p.v)}</span>
            </div>
            <span className={`mt-1 text-[9px] font-semibold uppercase tracking-wider ${p.hot ? "text-amber-200/90" : "text-emerald-200/80"}`}>{p.l}</span>
          </div>
          {i < parts.length - 1 && <span className="-mt-3.5 text-[14px] font-bold text-emerald-300/60">:</span>}
        </div>
      ))}
    </div>
  );
}
