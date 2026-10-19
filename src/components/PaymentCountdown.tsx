"use client";

import { useEffect, useState } from "react";

// Hitung mundur batas bayar pesanan PENDING. deadline = waktu order dibuat + 60 menit.
// Habis → tampilkan "kadaluarsa" + refresh (pesanan sudah/akan terhapus otomatis).
export default function PaymentCountdown({ deadline, className }: { deadline: string; className?: string }) {
  const target = new Date(deadline).getTime();
  const [left, setLeft] = useState(() => target - Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const ms = target - Date.now();
      setLeft(ms);
      if (ms <= 0) { clearInterval(id); setTimeout(() => location.reload(), 1500); }
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (left <= 0) {
    return <p className={`text-xs font-semibold text-red-600 ${className ?? ""}`}>Waktu pembayaran habis. Pesanan dibatalkan.</p>;
  }

  const total = Math.floor(left / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return (
    <p className={`text-xs text-gray-600 ${className ?? ""}`}>
      Selesaikan dalam <span className="font-mono text-sm font-bold text-red-600">{mm}:{ss}</span> atau pesanan dibatalkan.
    </p>
  );
}
