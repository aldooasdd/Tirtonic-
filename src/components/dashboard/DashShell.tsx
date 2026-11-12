"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "./ui";

export type NavItem = { href: string; label: string; icon: IconName; badge?: number };
export type NavGroup = { label: string; items: NavItem[] };

function openHash() {
  setTimeout(() => {
    const el = location.hash && document.getElementById(location.hash.slice(1));
    if (!el) return;
    if (el instanceof HTMLDetailsElement) el.open = true;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 60);
}

// Shell admin: sidebar terang (desktop) + drawer (mobile). Item difilter per role di layout server.
export default function DashShell({ groups, role, logout, children }: { groups: NavGroup[]; role: string; logout: () => Promise<void>; children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const stringing = path.startsWith("/dashboard/stringing");
  useEffect(() => setOpen(false), [path]);
  // Link #section di /dashboard → buka <details> tujuan lalu scroll.
  useEffect(() => {
    openHash();
    window.addEventListener("hashchange", openHash);
    return () => window.removeEventListener("hashchange", openHash);
  }, [path]);

  // Item aktif = href (tanpa #) paling panjang yang jadi awalan path.
  const all = groups.flatMap((g) => g.items);
  const active = all
    .filter((i) => !i.href.includes("#"))
    .filter((i) => path === i.href || path.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];

  const nav = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="h-9 w-9 rounded-xl" />
        <span className="text-lg font-bold text-[#0F1F1A]">Tirtonic</span>
        <button onClick={() => setOpen(false)} className="ml-auto text-[#9AA6A1] lg:hidden" aria-label="Tutup menu">
          <Icon name="x" className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-3.5 pb-4">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-[#9AA6A1]">{g.label}</div>
            <ul className="space-y-0.5">
              {g.items.map((i) => {
                const on = i === active;
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      onClick={i.href.includes("#") ? openHash : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${on ? "border border-[#E6EAE8] bg-white font-medium text-[#0F1F1A] shadow-[0_1px_2px_rgba(15,31,26,0.06)]" : "border border-transparent text-[#3F4D47] hover:bg-white/70"}`}
                    >
                      <Icon name={i.icon} className={`h-4 w-4 ${on ? "text-primary" : "text-[#6B7A74]"}`} />
                      <span className="flex-1">{i.label}</span>
                      {!!i.badge && <span className="rounded-full bg-ball px-2 text-[11px] font-semibold leading-[18px] text-[#0E3B2E]">{i.badge}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="m-3.5 flex items-center gap-3 rounded-xl border border-[#E6EAE8] bg-white p-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#0E3B2E] text-xs font-bold text-white">{role.slice(0, 2).toUpperCase()}</span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-medium text-[#0F1F1A]">{role}</div>
          <Link href="/dashboard/password" className="text-[11px] text-[#9AA6A1] hover:text-primary">Ganti sandi</Link>
        </div>
        <form action={logout}>
          <button className="rounded-lg p-1.5 text-[#6B7A74] hover:bg-red-50 hover:text-red-600" aria-label="Logout" title="Logout">
            <Icon name="logout" />
          </button>
        </form>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#F7F8F7] text-[#0F1F1A]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-[#E6EAE8] bg-[#FAFBFA] lg:block">{nav}</aside>

      {/* mobile drawer */}
      <div className={`fixed inset-0 z-40 lg:hidden ${open ? "" : "pointer-events-none"}`}>
        <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} />
        <aside className={`absolute inset-y-0 left-0 w-[264px] bg-[#FAFBFA] shadow-xl transition-transform ${open ? "translate-x-0" : "-translate-x-full"}`}>{nav}</aside>
      </div>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[#E6EAE8] bg-white/90 px-4 backdrop-blur lg:h-16 lg:px-8">
          <button onClick={() => setOpen(true)} className="-ml-1 rounded-lg p-1.5 text-[#0F1F1A] lg:hidden" aria-label="Buka menu">
            <Icon name="menu" className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <Link href="/dashboard" className="hidden text-[#9AA6A1] hover:text-primary sm:inline">Dashboard</Link>
            {active && active.href !== "/dashboard" && (
              <>
                <span className="hidden text-[#C9D1CD] sm:inline">/</span>
                <Icon name={active.icon} className="h-4 w-4 shrink-0" />
                <span className="truncate font-medium">{active.label}</span>
              </>
            )}
          </div>
          <a href="/" target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-[#E6EAE8] px-3 py-1.5 text-sm text-[#3F4D47] hover:border-primary hover:text-primary">
            <Icon name="external" className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Lihat situs</span>
          </a>
        </header>
        <main className={`px-4 py-6 lg:px-8 lg:py-8 ${stringing ? "pb-28" : ""}`}>{children}</main>
      </div>

      {/* Navbar bawah (mobile) halaman stringing — Scan QR di tengah */}
      {stringing && (
        <nav className="fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md px-4 lg:hidden">
          <div className="grid grid-cols-5 items-center rounded-full border border-gray-100 bg-white/95 px-2 shadow-[0_8px_30px_rgba(0,0,0,0.14)] backdrop-blur [&_a]:outline-none [&_button]:outline-none">
            {[
              { href: "/dashboard/stringing", label: "Antrian", icon: "queue" as const, on: path === "/dashboard/stringing" },
              { href: "/dashboard/stringing#selesai", label: "Selesai", icon: "check" as const, on: false },
            ].map((t) => (
              <Link key={t.label} href={t.href} onClick={t.href.includes("#") ? openHash : undefined} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${t.on ? "font-semibold text-primary" : "text-[#7A8A84]"}`}>
                <Icon name={t.icon} className="h-[22px] w-[22px]" />
                {t.label}
              </Link>
            ))}
            <Link href="/dashboard/stringing/reward" aria-label="Scan QR" className="flex justify-center py-1.5">
              <span className={`grid h-12 w-12 place-items-center rounded-full shadow-[0_6px_16px_rgba(14,59,46,0.35)] ${path.startsWith("/dashboard/stringing/reward") ? "bg-primary" : "bg-[#0E3B2E]"} text-ball`}>
                <Icon name="scan" className="h-6 w-6" />
              </span>
            </Link>
            <Link href="/dashboard/password" className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-[#7A8A84]">
              <Icon name="key" className="h-[22px] w-[22px]" />
              Akun
            </Link>
            <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-[#7A8A84]">
              <Icon name="menu" className="h-[22px] w-[22px]" />
              Menu
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
