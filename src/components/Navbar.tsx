"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import { waLink } from "@/lib/format";
import { useCart } from "./CartProvider";

const MENU = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/articles", label: "Articles" },
  { href: "/contact", label: "Contact" },
  { href: "/sponsorship", label: "Sponsorship" },
];

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [kbOffset, setKbOffset] = useState(0);
  const [q, setQ] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const { count, setOpen: setCartOpen } = useCart();
  const ig = process.env.NEXT_PUBLIC_INSTAGRAM || "https://instagram.com/tirtonic";

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
  }

  // Live filter: update results as the user types (debounced).
  useEffect(() => {
    if (!searchOpen) return;
    const term = q.trim();
    if (!term) return;
    const t = setTimeout(() => {
      router.replace(`/shop?q=${encodeURIComponent(term)}`);
    }, 250);
    return () => clearTimeout(t);
  }, [q, searchOpen, router]);

  // Hide on scroll down, show on scroll up.
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (open || searchOpen) return; // keep visible while menu/search open
      if (y > last && y > 80) setHidden(true);
      else if (y < last) setHidden(false);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open, searchOpen]);

  // On mobile the navbar is a bottom bar; the on-screen keyboard would cover it when
  // the search field is focused. Lift it to sit just above the keyboard using the
  // VisualViewport API. No-op on desktop (no soft keyboard → no viewport shrink).
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const kb = window.innerHeight - vv.height - vv.offsetTop;
      setKbOffset(searchOpen && kb > 120 ? kb : 0);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [searchOpen]);

  // Contact page is a standalone landing — no navbar there.
  if (pathname === "/contact") return null;

  return (
    <header
      style={kbOffset ? { bottom: kbOffset } : undefined}
      className={`fixed inset-x-0 z-50 transition-transform duration-300
                  bottom-0 sm:bottom-auto sm:top-0
                  ${hidden ? "translate-y-[140%] sm:-translate-y-[160%]" : "translate-y-0"}`}
    >
      <div className="mx-auto flex max-w-site items-center justify-center gap-4 px-4 py-3 sm:justify-between">
        {/* logo hidden on mobile (bottom-bar mode) */}
        <div className="hidden sm:block">
          <Logo />
        </div>

        {/* floating green pill — big (max-w-md), centered on phone / flush right on desktop */}
        <div className="relative w-full max-w-md">
          <div className="flex w-full items-center gap-3 rounded-xl bg-primary px-5 py-3.5 text-base font-bold text-white shadow-lg">
            <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2">
              Quick Access
              <span className={`transition ${open ? "rotate-180" : ""}`}>▾</span>
            </button>

            <div className="ml-auto flex items-center gap-3">
              {searchOpen && (
                <form onSubmit={submitSearch} className="flex items-center">
                  <input
                    autoFocus
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setSearchOpen(false);
                        setQ("");
                      }
                    }}
                    placeholder="Cari..."
                    className="h-6 w-28 rounded-full bg-white/20 px-3 text-sm font-normal text-white outline-none placeholder:text-white/70"
                  />
                </form>
              )}
              <button
                type="button"
                aria-label="Search"
                onClick={() => {
                  setSearchOpen((v) => !v);
                  setOpen(false);
                  setHidden(false);
                }}
                className="hover:opacity-80"
              >
                <SearchIcon />
              </button>
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                aria-label="Favorit"
                className="relative hover:opacity-80"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {count > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-primary">
                    {count}
                  </span>
                )}
              </button>
            </div>
          </div>

          {open && (
            <div
              className="animate-dropdown absolute left-0 z-50 w-full rounded-xl border bg-white p-6 text-gray-800 shadow-xl
                         bottom-full mb-2
                         sm:bottom-auto sm:top-full sm:mb-0 sm:mt-2"
            >
              <nav className="flex flex-col gap-4 text-base">
                {MENU.map((m) => (
                  <Link key={m.href} href={m.href} onClick={() => setOpen(false)} className="hover:text-primary">
                    {m.label}
                  </Link>
                ))}
                <hr className="my-1" />
                <a href={waLink("Halo Admin Tirtonic, saya mau tanya-tanya produk (personal shopper).")} className="text-sm text-gray-600 hover:text-primary">
                  Ask personal shopper
                </a>
                <a href={ig} className="text-sm text-gray-600 hover:text-primary">
                  Follow our Instagram
                </a>
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
