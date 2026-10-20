"use client";

import { useState, useEffect } from "react";

type Step = { date: string; desc: string };
type TrackData = { history: Step[]; status?: string; fallbackUrl?: string | null; resi?: string; kurir?: string };

// Lacak paket di dalam dashboard. Timeline ditarik SAAT diklik (hemat kredit API).
// Kurir tanpa API (Paxel) → tampilkan tombol ke situs kurir.
export default function CustomerTracking({ orderId, kurir, resi }: { orderId: string; kurir: string; resi: string }) {
  const [data, setData] = useState<TrackData | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function lacak() {
    setBusy(true); setErr("");
    try {
      const res = await fetch(`/api/track?orderId=${encodeURIComponent(orderId)}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setErr("Gagal melacak. Coba lagi sebentar.");
    } finally {
      setBusy(false);
    }
  }

  // Auto-lacak saat laman dibuka. ponytail: 1 call Binderbyte per buka laman.
  useEffect(() => { lacak(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-gray-600">
          {kurir} · <span className="font-mono font-bold text-gray-900">{resi}</span>
        </p>
        {!data && (
          <button onClick={lacak} disabled={busy} className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50">
            {busy ? "Melacak…" : "Lacak Paket"}
          </button>
        )}
      </div>

      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}

      {data && data.history.length > 0 && (
        <ol className="mt-3 space-y-3 border-l-2 border-blue-200 pl-4">
          {data.history.map((s, i) => (
            <li key={i} className="relative">
              <span className={`absolute -left-[22px] top-1 h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-blue-600" : "bg-blue-300"}`} />
              <p className="text-gray-800">{s.desc}</p>
              <p className="text-xs text-gray-400">{s.date}</p>
            </li>
          ))}
        </ol>
      )}

      {data && data.history.length === 0 && (
        <div className="mt-2 text-xs text-gray-500">
          {data.fallbackUrl ? (
            <a href={data.fallbackUrl} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 hover:underline">
              Lacak di situs {kurir} →
            </a>
          ) : (
            "Belum ada data perjalanan, atau kurir ini belum didukung pelacakan otomatis."
          )}
        </div>
      )}
    </div>
  );
}
