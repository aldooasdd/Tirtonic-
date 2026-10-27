"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

// Kotak scan hadiah untuk scanner Zebra (keyboard-wedge): scan QR → URL/token
// diketik ke input + Enter → langsung ke halaman tukar. Juga bisa diketik manual.
export default function RewardScanBox() {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [val, setVal] = useState("");

  const go = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    // URL penuh → ambil bagian setelah "/reward/"; selain itu anggap token mentah.
    const m = v.match(/\/reward\/([^/?#\s]+)/);
    const token = m ? m[1] : v;
    router.push(`/dashboard/stringing/reward/${encodeURIComponent(token)}`);
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); go(val); }}
      className="rounded-2xl border bg-white p-5 shadow-sm"
    >
      <label className="block text-sm font-bold text-gray-900">Scan QR hadiah</label>
      <p className="mt-0.5 text-xs text-gray-500">Arahkan scanner Zebra ke QR &quot;Redeem Reward&quot; di HP customer.</p>
      <input
        ref={ref}
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Menunggu scan…"
        className="field mt-3"
      />
      <button className="btn-green mt-3 w-full">Buka</button>
    </form>
  );
}
