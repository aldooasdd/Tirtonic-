"use client";

import { useState } from "react";

// Teks deskripsi panjang diringkas ke beberapa baris; klik "Selengkapnya" untuk full.
// Biar picker varian + tombol Reserve tetap sejajar tinggi foto produk.
export default function ClampText({ text, lines = 4 }: { text: string; lines?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <p
        className={`whitespace-pre-line text-sm leading-relaxed text-gray-600 ${open ? "" : "overflow-hidden"}`}
        style={open ? undefined : { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical" }}
      >
        {text}
      </p>
      <button type="button" onClick={() => setOpen((v) => !v)} className="mt-1 text-sm font-semibold text-primary hover:underline">
        {open ? "Tutup" : "Selengkapnya"}
      </button>
    </div>
  );
}
