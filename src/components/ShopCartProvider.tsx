"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type CartItem = {
  key: string; // productId::variantId
  productId: string;
  variantId: string | null;
  nama: string;
  varian: string | null;
  harga: number; // harga satuan efektif (sudah diskon)
  gambar: string | null;
  qty: number;
  max: number; // stok tersedia (varian); 99 kalau tak dibatasi
};

type Ctx = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "key">) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const ShopCartCtx = createContext<Ctx | null>(null);
export const useShopCart = () => {
  const c = useContext(ShopCartCtx);
  if (!c) throw new Error("useShopCart must be used within ShopCartProvider");
  return c;
};

const KEY = "tirtonic_cart";

export function ShopCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
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

  const clampQty = (qty: number, max: number) => Math.max(1, Math.min(qty, max || 99));

  const add = (item: Omit<CartItem, "key">) => {
    const key = `${item.productId}::${item.variantId ?? ""}`;
    setItems((prev) => {
      const found = prev.find((x) => x.key === key);
      if (found) return prev.map((x) => (x.key === key ? { ...x, qty: clampQty(x.qty + item.qty, item.max) } : x));
      return [...prev, { ...item, key, qty: clampQty(item.qty, item.max) }];
    });
  };
  const setQty = (key: string, qty: number) =>
    setItems((prev) => prev.map((x) => (x.key === key ? { ...x, qty: clampQty(qty, x.max) } : x)));
  const remove = (key: string) => setItems((prev) => prev.filter((x) => x.key !== key));
  const clear = () => setItems([]);

  const count = items.reduce((s, x) => s + x.qty, 0);
  const subtotal = items.reduce((s, x) => s + x.harga * x.qty, 0);

  return (
    <ShopCartCtx.Provider value={{ items, count, subtotal, add, setQty, remove, clear }}>
      {children}
    </ShopCartCtx.Provider>
  );
}
