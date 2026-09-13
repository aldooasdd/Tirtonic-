"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { rupiah, waLink } from "@/lib/format";

export type FavItem = { id: string; nama: string; harga: number; gambar: string | null };

type Ctx = {
  items: FavItem[];
  count: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  has: (id: string) => boolean;
  toggle: (p: FavItem) => void;
  add: (p: FavItem) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const FavCtx = createContext<Ctx | null>(null);
export const useFav = () => {
  const c = useContext(FavCtx);
  if (!c) throw new Error("useFav must be used within CartProvider");
  return c;
};
// backwards-compatible alias
export const useCart = useFav;

const KEY = "tirtonic_favorites";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<FavItem[]>([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem(KEY);
      if (s) setItems(JSON.parse(s));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items, hydrated]);

  const has = (id: string) => items.some((x) => x.id === id);
  const add = (p: FavItem) => setItems((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p]));
  const remove = (id: string) => setItems((prev) => prev.filter((x) => x.id !== id));
  const toggle = (p: FavItem) => setItems((prev) => (prev.some((x) => x.id === p.id) ? prev.filter((x) => x.id !== p.id) : [...prev, p]));
  const clear = () => setItems([]);

  return (
    <FavCtx.Provider value={{ items, count: items.length, open, setOpen, has, toggle, add, remove, clear }}>
      {children}
      <FavDrawer />
    </FavCtx.Provider>
  );
}

function orderText(items: FavItem[], total: number) {
  const lines = items.map((x) => `- ${x.nama} (${rupiah(x.harga)})`).join("\n");
  return `Halo Admin Tirtonic, saya tertarik dengan produk berikut:\n${lines}\n\nTotal: ${rupiah(total)}`;
}

function FavDrawer() {
  const { items, open, setOpen, remove, clear } = useFav();
  const total = items.reduce((s, x) => s + x.harga, 0);

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        className={`fixed right-0 top-0 z-[70] flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-2xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b px-4 py-4">
          <h2 className="text-lg font-bold text-gray-900">Favorit</h2>
          <button onClick={() => setOpen(false)} aria-label="Tutup" className="text-2xl leading-none text-gray-500 hover:text-gray-800">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="mt-10 text-center text-sm text-gray-500">Belum ada produk favorit.</p>
          ) : (
            <ul className="space-y-4">
              {items.map((x) => (
                <li key={x.id} className="flex gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded border bg-gray-100">
                    {x.gambar && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={x.gambar} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{x.nama}</p>
                    <p className="text-sm text-primary">{rupiah(x.harga)}</p>
                    <button onClick={() => remove(x.id)} className="mt-1 text-xs text-red-500 hover:underline">Hapus</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t p-4">
            <a href={waLink(orderText(items, total))} target="_blank" rel="noreferrer" className="btn-pill w-full bg-[#25D366]">
              Pesan via WhatsApp
            </a>
            <button onClick={clear} className="mt-2 w-full text-center text-xs text-gray-500 hover:text-red-600">
              Kosongkan favorit
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
