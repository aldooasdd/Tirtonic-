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
    <div className="mt-4 px-4">
      <div className="rounded-2xl bg-gradient-to-br from-primaryDark to-primary px-5 py-4 text-white">
        <p className="text-xs font-bold tracking-widest text-white/80">POSISI ANDA <span className="ml-1 font-extrabold text-white">#{data.rank} · {data.n} stringing</span></p>
        <p className="mt-0.5 text-sm text-white/80">
          {data.toTop3 ? `${data.toTop3} stringing lagi untuk masuk 3 besar` : "Kamu sudah masuk 3 besar! 🎉"}
        </p>
      </div>
    </div>
  );
}
