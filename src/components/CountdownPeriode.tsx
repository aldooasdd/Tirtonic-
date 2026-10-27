"use client";

import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

// Countdown live ke akhir periode leaderboard (deadline ISO). `dark` = di atas header hijau.
export default function CountdownPeriode({ deadline, dark }: { deadline: string; dark?: boolean }) {
  const end = new Date(deadline).getTime();
  const [ms, setMs] = useState(() => end - Date.now());
  useEffect(() => {
    const t = setInterval(() => setMs(end - Date.now()), 1000);
    return () => clearInterval(t);
  }, [end]);

  const cTitle = dark ? "text-white/80" : "text-gray-600";
  const cLabel = dark ? "text-white/50" : "text-gray-400";
  // Makin dekat deadline makin merah terang; >=30 hari putih. Interpolasi hsl.
  const f = Math.max(0, Math.min(1, ms / (30 * 86400000)));
  const digitColor = `hsl(0, ${Math.round(100 * (1 - f))}%, ${Math.round(100 - 45 * (1 - f))}%)`;
  const cDot = dark ? "bg-white/40" : "bg-gray-300";

  if (ms <= 0) return <p className={`text-sm font-bold ${dark ? "text-white/80" : "text-gray-800"}`}>Periode sudah berakhir</p>;
  const parts = [
    { v: Math.floor(ms / 86400000), l: "days" },
    { v: Math.floor((ms % 86400000) / 3600000), l: "hrs" },
    { v: Math.floor((ms % 3600000) / 60000), l: "min" },
    { v: Math.floor((ms % 60000) / 1000), l: "sec" },
  ];

  return (
    <div className={dark ? "text-right" : ""}>
      <p className={`text-xs font-bold ${cTitle}`}>Periode Berakhir Dalam</p>
      <div className={`mt-1.5 flex items-start gap-1.5 ${dark ? "justify-end" : "justify-center"}`}>
        {parts.map((p, i) => (
          <div key={p.l} className="flex items-start gap-1.5">
            <div className="flex flex-col items-center">
              <span className="text-lg font-extrabold leading-none tabular-nums" style={{ color: digitColor }}>{pad(p.v)}</span>
              <span className={`mt-0.5 text-[10px] ${cLabel}`}>{p.l}</span>
            </div>
            {i < parts.length - 1 && (
              <span className="flex flex-col gap-0.5 pt-1" aria-hidden>
                <span className={`h-0.5 w-0.5 rounded-full ${cDot}`} />
                <span className={`h-0.5 w-0.5 rounded-full ${cDot}`} />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
