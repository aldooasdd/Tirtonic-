"use client";

import { useEffect } from "react";

// Hitung 1 view per kunjungan dari sisi client, biar halaman produk bisa di-cache (ISR)
// tanpa kehilangan counter. Gagal pun diabaikan — gak pernah ganggu tampilan.
export default function ViewBeacon({ id }: { id: string }) {
  useEffect(() => {
    const key = `pv:${id}`;
    try {
      if (sessionStorage.getItem(key)) return; // jangan dobel di sesi yang sama
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage bisa throw (private mode) — lanjut aja
    }
    fetch(`/api/product-view/${id}`, { method: "POST", keepalive: true }).catch(() => {});
  }, [id]);
  return null;
}
