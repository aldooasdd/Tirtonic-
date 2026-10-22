"use client";

import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

// Countdown live ke akhir periode leaderboard (deadline ISO). UI big red digits + label.
export default function CountdownPeriode({ deadline }: { deadline: string }) {
  const end = new Date(deadline).getTime();
  const [ms, setMs] = useState(() => end - Date.now());
  useEffect(() => {
    const t = setInterval(() => setMs(end - Date.now()), 1000);
    return () => clearInterval(t);
  }, [end]);

  if (ms <= 0) return <p className="text-sm font-bold text-gray-800">Periode sudah berakhir</p>;
  const parts = [
    { v: Math.floor(ms / 86400000), l: "days" },
    { v: Math.floor((ms % 86400000) / 3600000), l: "hrs" },
    { v: Math.floor((ms % 3600000) / 60000), l: "min" },
    { v: Math.floor((ms % 60000) / 1000), l: "sec" },
  ];

  return (
    <div>
      <p className="text-base font-extrabold text-gray-900">Periode Berakhir Dalam</p>
      <div className="mt-3 flex items-start justify-center gap-2 sm:gap-3">
        {parts.map((p, i) => (
          <div key={p.l} className="flex items-start gap-2 sm:gap-3">
            <div className="flex flex-col items-center">
              <span className="text-4xl font-extrabold leading-none text-red-600 tabular-nums">{pad(p.v)}</span>
              <span className="mt-1.5 text-xs text-gray-400">{p.l}</span>
            </div>
            {i < parts.length - 1 && (
              <span className="flex flex-col gap-1 pt-2.5" aria-hidden>
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span className="h-1 w-1 rounded-full bg-gray-300" />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
