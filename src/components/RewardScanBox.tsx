"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Scan QR hadiah / potongan poin. Dua cara:
// 1) Kamera HP (BarcodeDetector native) — tombol "Scan Kamera".
// 2) Scanner Zebra (keyboard-wedge) / ketik manual → input + Enter.
// QR berisi URL penuh → langsung ke path-nya (reward/redeem). Token mentah → anggap reward.
export default function RewardScanBox() {
  const router = useRouter();
  const [val, setVal] = useState("");
  const [cam, setCam] = useState(false);
  const [err, setErr] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const go = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    const m = v.match(/\/(reward|redeem)\/([^/?#\s]+)/);
    if (m) { router.push(`/dashboard/stringing/${m[1]}/${encodeURIComponent(m[2])}`); return; }
    router.push(`/dashboard/stringing/reward/${encodeURIComponent(v)}`); // token mentah → reward
  };

  const stopCam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCam(false);
  };

  useEffect(() => {
    if (!cam) return;
    let stop = false;
    // @ts-expect-error BarcodeDetector belum ada di lib TS
    const Det = typeof window !== "undefined" ? window.BarcodeDetector : undefined;
    const detector = Det ? new Det({ formats: ["qr_code"] }) : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let jsQR: any = null;
    const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true }) ?? null;

    const hit = (raw: string) => { stopCam(); go(raw); };

    (async () => {
      try {
        if (!detector) jsQR = (await import("jsqr")).default; // fallback iOS/Safari
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) { v.srcObject = stream; await v.play(); }
        const tick = async () => {
          const v = videoRef.current;
          if (stop || !v || !v.videoWidth) { if (!stop) setTimeout(tick, 150); return; }
          try {
            if (detector) {
              const codes = await detector.detect(v);
              if (codes[0]?.rawValue) return hit(codes[0].rawValue);
            } else if (jsQR && ctx && canvas) {
              canvas.width = v.videoWidth; canvas.height = v.videoHeight;
              ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const r = jsQR(img.data, canvas.width, canvas.height);
              if (r?.data) return hit(r.data);
            }
          } catch { /* frame gagal, lanjut */ }
          if (!stop) setTimeout(tick, 150);
        };
        setTimeout(tick, 150);
      } catch {
        setErr("Tak bisa akses kamera. Izinkan kamera atau pakai ketik manual.");
        setCam(false);
      }
    })();
    return () => { stop = true; streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  }, [cam]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <label className="block text-sm font-bold text-gray-900">Scan QR hadiah / potongan poin</label>
      <p className="mt-0.5 text-xs text-gray-500">Scan QR di HP customer dengan kamera, scanner Zebra, atau ketik manual.</p>

      {cam ? (
        <div className="mt-3">
          <div className="relative overflow-hidden rounded-xl border bg-black">
            <video ref={videoRef} className="h-64 w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-white/70" />
          </div>
          <button onClick={stopCam} className="mt-2 w-full rounded-full border border-gray-300 py-2 text-sm font-semibold text-gray-600">Tutup kamera</button>
        </div>
      ) : (
        <button onClick={() => { setErr(""); setCam(true); }} className="btn-green mt-3 flex w-full items-center justify-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M3 12h18" /></svg>
          Scan Kamera
        </button>
      )}

      {err && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{err}</p>}

      <form onSubmit={(e) => { e.preventDefault(); go(val); }} className="mt-3">
        <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Atau scan Zebra / ketik token…" className="field" />
        <button className="mt-2 w-full rounded-full border border-gray-300 py-2 text-sm font-semibold text-gray-600">Buka manual</button>
      </form>
    </div>
  );
}
