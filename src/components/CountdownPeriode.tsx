"use client";

import { useEffect, useState } from "react";

// Countdown live ke akhir periode leaderboard (deadline ISO).
export default function CountdownPeriode({ deadline }: { deadline: string }) {
  const end = new Date(deadline).getTime();
  const [ms, setMs] = useState(() => end - Date.now());
  useEffect(() => {
    const t = setInterval(() => setMs(end - Date.now()), 1000);
    return () => clearInterval(t);
  }, [end]);

  if (ms <= 0) return <p className="mt-1 text-sm font-bold text-gray-800">Periode sudah berakhir</p>;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return (
    <p className="mt-1 text-sm font-bold text-gray-800">
      Periode berakhir dalam {d} hari {h} jam {m} menit {s} detik
    </p>
  );
}
