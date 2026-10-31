"use client";

import { useEffect, useState } from "react";
import { createRedemption } from "@/app/riwayat/tukar-actions";

const ACE_VALUE = 1000;
const MIN = 50;
const rupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");

// Tukar Ace Points → QR potongan sekali pakai (tanpa saldo tersimpan).
export default function TukarPoin({ phone, balance }: { phone: string; balance: number }) {
  const start = Math.min(1000, balance - (balance % MIN));
  const [nominal, setNominal] = useState(Math.max(0, start));
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  useEffect(() => {
    if (!open || !token || qr) return;
    const url = `${window.location.origin}/dashboard/stringing/redeem/${encodeURIComponent(token)}`;
    import("qrcode").then((m) => m.default.toDataURL(url, { width: 260, margin: 1 }).then(setQr).catch(() => {}));
  }, [open, token, qr]);

  const presets = [250, 500, 1000].filter((v) => v <= balance);
  const pct = balance > 0 ? Math.round((nominal / balance) * 100) : 0;

  const redeem = async (points: number, kind: "kasir" | "stringing", note: string) => {
    setBusy(true); setErr("");
    const r = await createRedemption(phone, points, kind, note);
    setBusy(false);
    if (r.ok && r.token) { setToken(r.token); setQr(""); setOpen(true); }
    else setErr(r.error || "Gagal.");
  };

  const canRedeem = nominal >= MIN && nominal <= balance;

  return (
    <>
      {/* Pilih nominal tukar */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold tracking-tight text-slate-900">Pilih Nominal Tukar</h3>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{pct}% saldo</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-slate-500">Jumlah Poin</span>
          <span className="font-mono text-3xl font-extrabold text-emerald-900">{nominal.toLocaleString("id-ID")}<span className="ml-1 text-sm font-bold text-slate-400">PTS</span></span>
        </div>
        <input
          type="range" min={0} max={balance} step={MIN} value={nominal}
          onChange={(e) => setNominal(parseInt(e.target.value, 10))}
          className="mt-3 w-full accent-emerald-600"
        />
        <div className="mt-3 grid grid-cols-4 gap-2">
          {presets.map((v) => (
            <button key={v} onClick={() => setNominal(v)} className={`rounded-xl px-2 py-2 text-xs font-semibold ${nominal === v ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>{v}</button>
          ))}
          <button onClick={() => setNominal(balance - (balance % MIN))} className={`rounded-xl px-2 py-2 text-xs font-semibold ${nominal === balance - (balance % MIN) ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>Semua</button>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
          <span className="text-xs text-slate-500">Potongan diterima</span>
          <span className="text-xl font-extrabold text-emerald-700">{rupiah(nominal * ACE_VALUE)}</span>
        </div>
        <button onClick={() => redeem(nominal, "kasir", "Potongan belanja di kasir/checkout")} disabled={busy || !canRedeem} className="btn-green mt-4 w-full disabled:opacity-50">
          {busy ? "Memproses…" : "Tukar Sekarang"}
        </button>
        {err && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-600">{err}</p>}
        <p className="mt-2 text-center text-[11px] text-slate-400">Min {MIN} poin. QR dipotong maksimal 30% dari total belanja oleh kasir.</p>
      </section>

      {/* Penukaran langsung */}
      <section className="space-y-2">
        <h3 className="px-1 text-xs font-bold uppercase tracking-widest text-slate-500">Penukaran Langsung</h3>
        <button onClick={() => balance >= 200 && redeem(200, "stringing", "Diskon Jasa Stringing (200 poin)")} disabled={busy || balance < 200}
          className="flex w-full items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm active:scale-[0.99] disabled:opacity-50">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-xl">🎾</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900">Potongan Jasa Stringing</p>
            <p className="text-[11px] text-slate-500">Tukar 200 PTS → diskon {rupiah(200 * ACE_VALUE)} jasa pasang</p>
          </div>
          <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">Klaim</span>
        </button>
      </section>

      {/* Popup QR liquid glass */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setOpen(false)} />
          <div className="relative z-10 m-3 w-full max-w-sm overflow-hidden rounded-[28px] border border-white/50 bg-white/70 p-6 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.4)] backdrop-blur-2xl backdrop-saturate-150">
            <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-white/50 blur-3xl" />
            <div className="relative space-y-3 text-center">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">Tukar Poin</span>
                <button onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-slate-500 active:scale-90">✕</button>
              </div>
              <h2 className="text-lg font-bold text-slate-900">Tunjukkan ke Kasir</h2>
              <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-2xl border border-white/60 bg-white p-2">
                {qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qr} alt="QR potongan" className="h-full w-full" />
                ) : <span className="text-sm text-slate-400">Memuat QR…</span>}
              </div>
              <p className="text-xs text-slate-500">Poin dipotong setelah kasir scan &amp; konfirmasi. Berlaku sekali.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
