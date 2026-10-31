"use client";

import { useEffect, useState } from "react";
import { requestRewardOtp, verifyRewardOtp, saveRewardItems } from "@/app/riwayat/claim-actions";

type Phase = "closed" | "start" | "otp" | "qr";

const maskPhone = (p: string) => (p.length > 4 ? "•••• " + p.slice(-4) : p);

// Tipe item hadiah dari teksnya (buat label/ikon katalog).
function kindOf(item: string): { kind: string; unit: string } {
  if (/stringing|pasang|jasa/i.test(item)) return { kind: "Voucher Digital", unit: "1 Tiket" };
  if (/voucher|rp\s*\d|diskon/i.test(item)) return { kind: "Web & Kasir", unit: "1 Kode" };
  return { kind: "Fisik Outlet", unit: "Ambil" };
}

// Katalog hadiah (multi-select) + tombol Klaim → popup liquid glass (OTP → QR).
export default function RewardClaimCatalog({ token, rank, items, phone, expired }: { token: string; rank: number; items: string[]; phone: string; expired: boolean }) {
  const [sel, setSel] = useState<Set<string>>(new Set(items));
  const [phase, setPhase] = useState<Phase>("closed");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState("");

  useEffect(() => {
    if (phase === "closed") return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [phase]);

  useEffect(() => {
    if (phase !== "qr" || qr) return;
    const url = `${window.location.origin}/dashboard/stringing/reward/${encodeURIComponent(token)}`;
    import("qrcode").then((m) => m.default.toDataURL(url, { width: 260, margin: 1 }).then(setQr).catch(() => {}));
  }, [phase, qr, token]);

  const toggle = (it: string) => setSel((s) => { const n = new Set(s); n.has(it) ? n.delete(it) : n.add(it); return n; });
  const close = () => { setPhase("closed"); setCode(""); setErr(""); setBusy(false); };

  const sendOtp = async () => {
    setBusy(true); setErr("");
    const r = await requestRewardOtp(token);
    setBusy(false);
    if (r.ok) setPhase("otp"); else setErr(r.error || "Gagal.");
  };
  const verify = async () => {
    setBusy(true); setErr("");
    const v = await verifyRewardOtp(token, code);
    if (!v.ok) { setBusy(false); setErr(v.error || "Gagal."); return; }
    const s = await saveRewardItems(token, [...sel]);
    setBusy(false);
    if (s.ok) setPhase("qr"); else setErr(s.error || "Gagal.");
  };

  return (
    <>
      <section id="katalog" className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h3 className="text-base font-bold tracking-tight text-slate-900">Katalog Klaim Hadiah</h3>
            <p className="text-xs text-slate-500">Pilih hadiah yang mau ditukar untuk peringkatmu</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">{items.length} Pilihan</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {items.map((it) => {
            const on = sel.has(it);
            const k = kindOf(it);
            return (
              <button
                key={it} type="button" onClick={() => !expired && toggle(it)} disabled={expired}
                className={`flex flex-col justify-between rounded-2xl border p-3 text-left transition active:scale-[0.98] disabled:opacity-60 ${on ? "border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600" : "border-slate-200 bg-white"}`}
              >
                <div className="mb-3 flex aspect-square w-full items-center justify-center rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-amber-50">
                  <span className="text-3xl">{k.kind === "Fisik Outlet" ? "🎁" : k.kind === "Web & Kasir" ? "🎟️" : "🎾"}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-emerald-700">{k.kind}</span>
                  <p className="mt-0.5 line-clamp-2 text-sm font-bold text-slate-900">{it}</p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="text-sm font-bold text-emerald-700">{k.unit}</span>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-md border text-[11px] ${on ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-transparent"}`}>✓</span>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setPhase("start")} disabled={expired || sel.size === 0}
          className="btn-green w-full disabled:opacity-50"
        >
          {expired ? "Hadiah kadaluarsa" : `Klaim Hadiah Peringkat ${rank} (${sel.size})`}
        </button>
      </section>

      {/* Popup liquid glass: OTP → QR */}
      {phase !== "closed" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={close} />
          <div className="relative z-10 m-3 w-full max-w-sm overflow-hidden rounded-[28px] border border-white/50 bg-white/70 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.4)] backdrop-blur-2xl backdrop-saturate-150">
            <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-white/50 blur-3xl" />
            <div className="relative p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600">Klaim Hadiah · P{rank}</span>
                <button onClick={close} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-slate-500 active:scale-90">✕</button>
              </div>

              {phase === "start" && (
                <div className="space-y-4 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-3xl">🎁</div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Verifikasi dulu</h2>
                    <p className="mt-1 text-sm text-slate-600">Kode OTP dikirim ke WhatsApp <strong>{maskPhone(phone)}</strong> untuk konfirmasi {sel.size} hadiah.</p>
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
                  <button onClick={verify} disabled={busy || code.length < 6} className="btn-green w-full disabled:opacity-60">{busy ? "Memeriksa…" : "Verifikasi & Tampilkan QR"}</button>
                  <button onClick={sendOtp} disabled={busy} className="text-xs font-medium text-slate-500 underline">Kirim ulang kode</button>
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
