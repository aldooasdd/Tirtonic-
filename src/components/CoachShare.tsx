"use client";

import { useEffect, useState } from "react";

// Kartu bagikan kode referral coach: salin, kirim WA, QR untuk dipajang di lapangan.
export default function CoachShare({ code, link, coachName }: { code: string; link: string; coachName: string }) {
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open && !qr) import("qrcode").then((m) => m.default.toDataURL(link, { width: 520, margin: 1, color: { dark: "#004328" } }).then(setQr)).catch(() => {});
  }, [open, qr, link]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${link}\nKode coach: ${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard diblokir — user bisa salin manual dari kotak link */ }
  };
  const wa = `https://wa.me/?text=${encodeURIComponent(`Halo! Daftar jadi murid ${coachName} di Tirtonic biar belanja & stringing kamu tercatat ya 🎾\n${link}\nKode coach: ${code}`)}`;
  const btn = "flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 transition active:scale-95";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Kode unik coach</div>
          <div className="font-mono text-lg font-extrabold tracking-wider text-emerald-900">{code}</div>
        </div>
        <button onClick={copy} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 active:scale-95">{copied ? "Tersalin ✓" : "Salin"}</button>
      </div>
      <div className="truncate rounded-2xl border border-dashed border-slate-200 px-4 py-2.5 font-mono text-[11px] text-slate-500">{link}</div>
      <a href={wa} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3 text-sm font-bold text-white shadow-sm transition active:scale-[0.98]">
        Bagikan ke WhatsApp Murid
      </a>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={copy} className={btn}>{copied ? "Tersalin ✓" : "Salin Link & Kode"}</button>
        <button onClick={() => setOpen(true)} className={btn}>QR Lapangan</button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">QR Murid Baru</div>
            <div className="mt-1 text-lg font-bold text-emerald-900">{coachName}</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {qr ? <img src={qr} alt={`QR ${code}`} className="mx-auto mt-4 w-full rounded-2xl" /> : <div className="mx-auto mt-4 aspect-square w-full animate-pulse rounded-2xl bg-slate-100" />}
            <div className="mt-3 font-mono text-sm font-bold tracking-wider text-slate-700">{code}</div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {qr && <a href={qr} download={`qr-coach-${code}.png`} className={btn}>Unduh</a>}
              <button onClick={() => setOpen(false)} className={btn}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
