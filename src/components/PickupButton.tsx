"use client";

import { useState } from "react";

// Tombol → tampilkan QR untuk discan admin. Dipakai ambil produk & pengembalian.
export default function PickupButton({
  token,
  qrPath = "pickup-qr",
  label = "Ambil produk",
  hint = "Tunjukkan QR ini ke admin Tirtonic untuk discan saat ambil produk demo.",
}: {
  token: string;
  qrPath?: "pickup-qr" | "return-qr";
  label?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 px-3.5 py-1.5 text-xs font-bold text-primary transition hover:bg-primary hover:text-white"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3M21 14v.01M14 21h.01M17 21h4v-4" /></svg>
        {open ? "Tutup QR" : label}
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-gray-200 bg-white p-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/${qrPath}/${token}`} alt={label} className="mx-auto h-44 w-44" />
          <p className="mt-2 text-xs text-gray-500">{hint}</p>
        </div>
      )}
    </div>
  );
}
