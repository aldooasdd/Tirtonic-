"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// "Cek Hadiah" → dashboard member (pakai nomor HP tersimpan sf_phone, tanpa login).
export default function CekHadiahLink({ className }: { className?: string }) {
  const [phone, setPhone] = useState<string | null>(null);
  useEffect(() => {
    try { setPhone(localStorage.getItem("sf_phone")); } catch { /* abaikan */ }
  }, []);
  return (
    <Link href={phone ? `/riwayat/${phone}` : "/"} className={className}>
      Cek Hadiah
    </Link>
  );
}
