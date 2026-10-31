"use client";

import { useEffect, useState } from "react";
import { requestRewardOtp, verifyRewardOtp, saveRewardItems } from "@/app/riwayat/claim-actions";

type Phase = "start" | "otp" | "pick" | "qr";

const maskPhone = (p: string) => (p.length > 4 ? "•••• " + p.slice(-4) : p);

// Kartu + popup klaim hadiah (liquid glass). Alur: OTP WA → pilih item → QR.
export default function ClaimReward({ token, rank, prize, period, phone }: { token: string; rank: number; prize: string; period: string; phone: string }) {
  const items = prize.split(" + ").map((s) => s.trim()).filter(Boolean);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("start");
  const [code, setCode] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set(items));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState("");

  // Lock scroll saat modal buka.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Render QR saat masuk fase qr.
  useEffect(() => {
    if (phase !== "qr" || qr) return;
    const url = `${window.location.origin}/dashboard/stringing/reward/${encodeURIComponent(token)}`;
    import("qrcode").then((m) => m.default.toDataURL(url, { width: 260, margin: 1 }).then(setQr).catch(() => {}));
  }, [phase, qr, token]);

  const reset = () => { setOpen(false); setPhase("start"); setCode(""); setErr(""); setBusy(false); };

  const sendOtp = async () => {
    setBusy(true); setErr("");
    const r = await requestRewardOtp(token);
    setBusy(false);
    if (r.ok) setPhase("otp"); else setErr(r.error || "Gagal.");
  };
  const verify = async () => {
    setBusy(true); setErr("");
    const r = await verifyRewardOtp(token, code);
    setBusy(false);
    if (r.ok) setPhase("pick"); else setErr(r.error || "Gagal.");
  };
  const confirmItems = async () => {
    setBusy(true); setErr("");
    const r = await saveRewardItems(token, [...sel]);
    setBusy(false);
    if (r.ok) setPhase("qr"); else setErr(r.error || "Gagal.");
  };
  const toggle = (it: string) => setSel((s) => { const n = new Set(s); n.has(it) ? n.delete(it) : n.add(it); return n; });

  return (
    <>
      {/* Kartu hadiah */}
      <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <p className="font-bold text-gray-900">Kamu Peringkat {rank}!</p>
          <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-600">{period}</span>
        </div>
        <p className="mt-1 text-sm text-gray-600">{prize}</p>
        <button onClick={() => setOpen(true)} className="btn-green mt-4 w-full">Claim Hadiah</button>
      </div>

      {/* Popup liquid glass */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={reset} />
          <div className="relative z-10 m-3 w-full max-w-sm overflow-hidden rounded-[28px] border border-white/50 bg-white/70 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.4)] backdrop-blur-2xl backdrop-saturate-150">
            {/* kilau atas */}
            <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-white/50 blur-3xl" />
            <div className="relative p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600">Klaim Hadiah · P{rank}</span>
                <button onClick={reset} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-slate-500 active:scale-90">✕</button>
              </div>

              {phase === "start" && (
                <div className="space-y-4 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-3xl">🎁</div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Verifikasi dulu</h2>
                    <p className="mt-1 text-sm text-slate-600">Kode OTP akan dikirim ke WhatsApp <strong>{maskPhone(phone)}</strong>.</p>
                  </div>
                  <button onClick={sendOtp} disabled={busy} className="btn-green w-full disabled:opacity-60">{busy ? "Mengirim…" : "Kirim Kode OTP"}</button>
                </div>
              )}

              {phase === "otp" && (
                <div className="space-y-4 text-center">
                  <h2 className="text-lg font-bold text-slate-900">Masukkan OTP</h2>
                  <p className="text-sm text-slate-600">Kode 6 digit dikirim ke WhatsApp {maskPhone(phone)}.</p>
                  <input
                    value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric" autoFocus placeholder="______"
                    className="w-full rounded-2xl border border-white/60 bg-white/70 py-3 text-center font-mono text-2xl tracking-[0.5em] text-slate-900 outline-none focus:border-primary"
                  />
                  <button onClick={verify} disabled={busy || code.length < 6} className="btn-green w-full disabled:opacity-60">{busy ? "Memeriksa…" : "Verifikasi"}</button>
                  <button onClick={sendOtp} disabled={busy} className="text-xs font-medium text-slate-500 underline">Kirim ulang kode</button>
                </div>
              )}

              {phase === "pick" && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h2 className="text-lg font-bold text-slate-900">Pilih hadiah</h2>
                    <p className="mt-1 text-sm text-slate-600">Centang yang mau ditukar. Bisa pilih semua.</p>
                  </div>
                  <div className="space-y-2">
                    {items.map((it) => {
                      const on = sel.has(it);
                      return (
                        <label key={it} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition ${on ? "border-primary bg-primary/10" : "border-white/60 bg-white/50"}`}>
                          <input type="checkbox" checked={on} onChange={() => toggle(it)} className="h-5 w-5 rounded-md accent-primary" />
                          <span className="text-sm font-medium text-slate-800">{it}</span>
                        </label>
                      );
                    })}
                  </div>
                  <button onClick={confirmItems} disabled={busy || sel.size === 0} className="btn-green w-full disabled:opacity-60">{busy ? "Menyimpan…" : "Tampilkan QR"}</button>
                </div>
              )}

              {phase === "qr" && (
                <div className="space-y-3 text-center">
                  <h2 className="text-lg font-bold text-slate-900">Tunjukkan ke Kasir</h2>
                  <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-2xl border border-white/60 bg-white p-2">
                    {qr ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qr} alt="QR hadiah" className="h-full w-full" />
                    ) : (
                      <span className="text-sm text-slate-400">Memuat QR…</span>
                    )}
                  </div>
                  <div className="rounded-2xl bg-white/50 p-3 text-left text-xs text-slate-600">
                    {[...sel].map((it) => <div key={it}>✓ {it}</div>)}
                  </div>
                  <p className="text-xs text-slate-500">Kasir scan QR ini untuk konfirmasi. Berlaku sekali.</p>
                </div>
              )}

              {err && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-600">{err}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
