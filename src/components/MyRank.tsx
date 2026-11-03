"use client";

import { useEffect, useState } from "react";

type Rank = { found: boolean; rank?: number; n?: number; toTop3?: number };

// Bar "POSISI ANDA" — pakai nomor HP tersimpan (sf_phone) tanpa login.
export default function MyRank({ loc, ym }: { loc: string; ym?: string }) {
  const [data, setData] = useState<Rank | null>(null);
  useEffect(() => {
    let phone = "";
    try { phone = localStorage.getItem("sf_phone") ?? ""; } catch { /* abaikan */ }
    if (!phone) { setData({ found: false }); return; }
    const p = new URLSearchParams({ phone });
    if (loc !== "global") p.set("loc", loc);
    if (ym) p.set("ym", ym);
    fetch(`/api/sf/rank?${p}`).then((r) => r.json()).then(setData).catch(() => setData({ found: false }));
  }, [loc, ym]);

  if (!data?.found) return null;
  return (
    <div className="rounded-3xl border border-white/80 bg-gradient-to-br from-white/90 via-slate-50/80 to-white/95 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0d5c3a] text-white shadow-sm">
          <span className="text-[15px] font-extrabold tracking-tight">#{data.rank}</span>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Posisi Anda</p>
          <p className="text-[15px] font-bold leading-tight tracking-tight text-slate-900">Peringkat #{data.rank} · {data.n} stringing</p>
        </div>
      </div>
      <div className={`mt-3 flex items-center gap-2 rounded-2xl border px-3 py-2 text-[12px] font-semibold ${data.toTop3 ? "border-amber-200/70 bg-amber-50 text-amber-800" : "border-emerald-200/60 bg-emerald-50 text-[#0d5c3a]"}`}>
        <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
        <span className="tracking-tight">
          {data.toTop3 ? `Butuh ${data.toTop3}× stringing lagi untuk masuk 3 besar` : "Kamu sudah masuk 3 besar! 🎉"}
        </span>
      </div>
    </div>
  );
}
