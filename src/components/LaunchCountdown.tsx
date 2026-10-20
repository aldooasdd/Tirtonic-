"use client";

import { useEffect, useState } from "react";

// Countdown ke tanggal hari-H launching. Hilang kalau sudah lewat / tanpa tanggal.
export default function LaunchCountdown({ date }: { date: string | null }) {
  const target = date ? new Date(date).getTime() : 0;
  const [now, setNow] = useState<number | null>(null); // null = belum mount (hindari mismatch SSR)

  useEffect(() => {
    if (!target) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);

  if (!target || now === null) return null;
  const diff = target - now;
  if (diff <= 0) return null;

  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const cell = (v: number, l: string) => (
    <div className="text-center">
      <span className="block text-xl font-extrabold tabular-nums text-gray-900 sm:text-3xl">{String(v).padStart(2, "0")}</span>
      <span className="text-[10px] uppercase tracking-wide text-gray-500 sm:text-xs">{l}</span>
    </div>
  );
  return (
    <div className="mb-2 flex items-end gap-3 sm:gap-4">
      {cell(d, "Hari")}
      {cell(h, "Jam")}
      {cell(m, "Menit")}
      {cell(s, "Detik")}
    </div>
  );
}
