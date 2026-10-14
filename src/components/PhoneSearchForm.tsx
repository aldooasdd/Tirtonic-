"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PhoneSearchForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = phone.replace(/[^0-9]/g, "");
    if (p.length < 8) return;
    router.push(`/riwayat/${encodeURIComponent(p)}`);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        inputMode="tel"
        autoFocus
        placeholder="08xxxxxxxxxx"
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-primary focus:outline-none"
      />
      <button type="submit" disabled={phone.replace(/[^0-9]/g, "").length < 8} className="btn-green w-full py-3 disabled:opacity-40">
        Lihat riwayat →
      </button>
    </form>
  );
}
