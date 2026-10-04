"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import ShopFilters from "./ShopFilters";
import ProductCard, { ProductCardData } from "./ProductCard";
import { SORT_OPTIONS } from "@/lib/constants";

function FilterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="10" y1="18" x2="14" y2="18" />
    </svg>
  );
}

export default function ShopClient({
  products,
  brands,
  q,
}: {
  products: ProductCardData[];
  brands: string[];
  q?: string;
}) {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  const sp = useSearchParams();

  // Desktop (lg+): filter always shown & can't be hidden. Below lg: toggle allowed
  // (open on tablet, hidden on phone).
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setOpen(mq.matches ? true : window.innerWidth >= 768);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  function setSort(value: string) {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set("sort", value);
    else next.delete("sort");
    router.push(`/shop?${next.toString()}`);
  }

  const sortEl = (
    <label className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm">
      <span className="text-gray-500">Sort:</span>
      <select
        value={sp.get("sort") || ""}
        onChange={(e) => setSort(e.target.value)}
        className="cursor-pointer bg-transparent font-medium text-gray-800 outline-none"
      >
        <option value="">Populer</option>
        {SORT_OPTIONS.filter((o) => o.value !== "populer").map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );

  const grid =
    products.length === 0 ? (
      <p className="py-20 text-center text-gray-500">
        {q ? "Produk tidak ditemukan." : "Belum ada produk. Tambahkan lewat dashboard admin."}
      </p>
    ) : (
      <div
        className={`grid gap-2 md:gap-3 ${
          open
            ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            : "grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        }`}
      >
        {products.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
    );

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-10 pt-3">
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="text-primary hover:underline">Home</Link>
        <span className="mx-2">/</span>
        <span>Product</span>
      </nav>

      {open ? (
        <div className="flex flex-col gap-8 md:flex-row">
          <aside className="w-full md:w-60 md:shrink-0">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Filter</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                title="Sembunyikan filter"
                aria-label="Sembunyikan filter"
                className="inline-flex rounded-full border border-primary p-2 text-primary transition lg:hidden"
              >
                <FilterIcon />
              </button>
            </div>
            <ShopFilters brands={brands} />
          </aside>

          <div className="flex-1">
            <div className="mb-6 flex items-center justify-between gap-4">
              <p className="text-sm text-gray-500">
                {q ? (
                  <>
                    Hasil untuk <strong>&ldquo;{q}&rdquo;</strong> ({products.length})
                  </>
                ) : (
                  `${products.length} produk`
                )}
              </p>
              {sortEl}
            </div>
            {grid}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-6 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:border-primary hover:text-primary"
            >
              <FilterIcon />
              Filter
            </button>
            {sortEl}
          </div>
          {grid}
        </div>
      )}
    </div>
  );
}
