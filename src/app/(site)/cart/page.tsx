"use client";

import Link from "next/link";
import { useShopCart } from "@/components/ShopCartProvider";
import { rupiah } from "@/lib/format";

export default function CartPage() {
  const { items, subtotal, setQty, remove } = useShopCart();

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6">
      <h1 className="mb-6 text-2xl font-extrabold text-gray-900">Keranjang</h1>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <p className="text-gray-500">Keranjang masih kosong.</p>
          <Link href="/shop" className="btn-green mt-4">Mulai belanja</Link>
        </div>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-3">
            {items.map((x) => (
              <li key={x.key} className="flex gap-3 rounded-xl border bg-white p-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-gray-100">
                  {x.gambar && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={x.gambar} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold text-gray-900">{x.nama}</p>
                  {x.varian && <p className="text-xs text-gray-500">{x.varian}</p>}
                  <p className="mt-1 text-sm font-bold text-primary">{rupiah(x.harga)}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex items-center rounded-lg border">
                      <button
                        onClick={() => setQty(x.key, x.qty - 1)}
                        aria-label="Kurangi"
                        className="flex h-9 w-9 items-center justify-center text-lg text-gray-600 hover:text-primary"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{x.qty}</span>
                      <button
                        onClick={() => setQty(x.key, x.qty + 1)}
                        aria-label="Tambah"
                        className="flex h-9 w-9 items-center justify-center text-lg text-gray-600 hover:text-primary"
                      >
                        +
                      </button>
                    </div>
                    <button onClick={() => remove(x.key)} className="text-xs font-medium text-red-500 hover:underline">
                      Hapus
                    </button>
                  </div>
                </div>
                <div className="shrink-0 text-right text-sm font-bold text-gray-900">{rupiah(x.harga * x.qty)}</div>
              </li>
            ))}
          </ul>

          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span className="font-bold text-gray-900">{rupiah(subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">Ongkir dihitung di halaman checkout.</p>
            <Link href="/checkout" className="btn-pill mt-4 w-full bg-primary hover:bg-primaryDark">
              Lanjut ke Checkout
            </Link>
            <Link href="/shop" className="mt-2 block text-center text-sm text-gray-500 hover:text-primary">
              Lanjut belanja
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
