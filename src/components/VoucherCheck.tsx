"use client";

import { useState } from "react";
import { checkCoupon } from "@/app/riwayat/voucher-actions";

// Input kode promo → cek validitas (reuse Coupon). Hasil tampil di bawah input.
export default function VoucherCheck() {
  const [code, setCode] = useState("");
  const [res, setRes] = useState<{ ok: boolean; desc?: string; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const check = async () => {
    setBusy(true);
    setRes(await checkCoupon(code));
    setBusy(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <input
          value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="MASUKKAN KODE PROMO…"
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-semibold tracking-wide text-slate-800 outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400"
        />
        <button onClick={check} disabled={busy || !code.trim()} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
          {busy ? "…" : "Klaim"}
        </button>
      </div>
      {res && (
        <p className={`mt-2 rounded-xl px-3 py-2 text-sm font-medium ${res.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
          {res.ok ? res.desc : res.error}
        </p>
      )}
    </div>
  );
}
