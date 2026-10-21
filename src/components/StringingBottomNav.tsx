"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const ICONS = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>,
  shop: <><path d="M6 2 4 6v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V6l-2-4Z" /><path d="M4 6h16" /><path d="M16 10a4 4 0 0 1-8 0" /></>,
  trophy: <><path d="M6 4h12v4a6 6 0 0 1-12 0Z" /><path d="M6 6H3v2a3 3 0 0 0 3 3" /><path d="M18 6h3v2a3 3 0 0 1-3 3" /><path d="M9 20h6" /><path d="M12 14v6" /></>,
  event: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  rocket: <><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z" /><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></>,
};

type Key = "home" | "shop" | "leaderboard" | "event" | "search" | "launch";

// Navbar bawah ala app (capsule terbang). Shop → /shop, Search → /cari.
// Leaderboard & Event masih placeholder (fitur nyusul).
export default function StringingBottomNav({ active, phone }: { active: Key; phone?: string | null }) {
  // Ingat nomor customer → Home selalu balik ke dashboard-nya walau pindah tab lain.
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  useEffect(() => {
    try {
      if (phone) localStorage.setItem("sf_phone", phone);
      else setSavedPhone(localStorage.getItem("sf_phone"));
    } catch { /* abaikan */ }
  }, [phone]);
  const homePhone = phone || savedPhone;

  const items: { key: Key; label: string; href: string; icon: JSX.Element }[] = [
    { key: "home", label: "Home", href: homePhone ? `/riwayat/${encodeURIComponent(homePhone)}` : "/cari", icon: ICONS.home },
    { key: "shop", label: "Shop", href: "/shop", icon: ICONS.shop },
    { key: "leaderboard", label: "Leaderboard", href: "/leaderboard", icon: ICONS.trophy },
    { key: "event", label: "Event", href: "/event", icon: ICONS.event },
    { key: "launch", label: "Launch", href: "/preorder", icon: ICONS.rocket },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-4 z-20 mx-auto max-w-md px-4">
      <div className="flex items-stretch justify-around rounded-full border border-gray-100 bg-white/95 px-2 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur">
        {items.map((it) => (
          <Link
            key={it.key}
            href={it.href}
            className={`flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 text-[11px] font-semibold transition ${it.key === active ? "text-primary" : "text-gray-400 hover:text-gray-600"}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{it.icon}</svg>
            <span className="whitespace-nowrap">{it.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
