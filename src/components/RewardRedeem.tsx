"use client";

import { useEffect, useState } from "react";

// Kartu hadiah leaderboard di dashboard customer. Tombol "Redeem Reward" → tampil QR
// (encode URL halaman tukar) buat discan staff toko. Hadiah ditukar sekali.
export default function RewardRedeem({ token, rank, prize, period }: { token: string; rank: number; prize: string; period: string }) {
  const [open, setOpen] = useState(false);
  const [img, setImg] = useState("");

  useEffect(() => {
    if (!open || img) return;
    const url = `${window.location.origin}/dashboard/stringing/reward/${encodeURIComponent(token)}`;
    import("qrcode").then((m) => m.default.toDataURL(url, { width: 240, margin: 1 }).then(setImg).catch(() => {}));
  }, [open, img, token]);

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-xl">🏆</span>
        <p className="font-bold text-gray-900">Kamu Peringkat {rank}!</p>
        <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-600">{period}</span>
      </div>
      <p className="mt-1 text-sm text-gray-600">{prize}</p>

      {!open ? (
        <button onClick={() => setOpen(true)} className="btn-green mt-4 w-full">Redeem Reward</button>
      ) : (
        <div className="mt-4 flex flex-col items-center">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt="QR hadiah" className="h-56 w-56 rounded-xl border bg-white p-2" />
          ) : (
            <div className="flex h-56 w-56 items-center justify-center text-sm text-gray-400">Memuat QR…</div>
          )}
          <p className="mt-3 text-center text-xs text-gray-500">Tunjukkan QR ini ke staff toko untuk discan. Berlaku sekali di cabang manapun.</p>
        </div>
      )}
    </div>
  );
}
