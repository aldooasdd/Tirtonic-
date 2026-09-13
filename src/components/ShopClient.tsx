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
  currentPage,
  totalPages,
}: {
  products: ProductCardData[];
  brands: string[];
  q?: string;
  currentPage: number;
  totalPages: number;
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
    next.delete("page");
    router.push(`/shop?${next.toString()}`);
  }

  function pageHref(n: number) {
    const next = new URLSearchParams(sp.toString());
    next.set("page", String(n));
    return `/shop?${next.toString()}`;
  }

  const pageList: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageList.push(i);
  } else {
    pageList.push(1);
    if (currentPage > 3) pageList.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pageList.push(i);
    if (currentPage < totalPages - 2) pageList.push("...");
    pageList.push(totalPages);
  }

  const paginationEl =
    totalPages > 1 ? (
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {pageList.map((p, i) =>
          p === "..." ? (
            <span key={`e${i}`} className="px-1 text-gray-400">
              …
            </span>
          ) : (
            <Link
              key={p}
              href={pageHref(p)}
              className={`min-w-[44px] rounded-lg border px-3 py-2 text-center text-sm font-semibold transition ${
                p === currentPage
                  ? "border-primary bg-primary text-white"
                  : "border-gray-300 text-gray-700 hover:border-primary"
              }`}
            >
              {p}
            </Link>
          )
        )}
        {currentPage < totalPages && (
          <Link
            href={pageHref(currentPage + 1)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-primary"
          >
            Next
          </Link>
        )}
      </div>
    ) : null;

  const sortEl = (
    <label className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm">
      <span className="text-gray-500">Sort:</span>
      <select
        value={sp.get("sort") || ""}
        onChange={(e) => setSort(e.target.value)}
        className="cursor-pointer bg-transparent font-medium text-gray-800 outline-none"
      >
        <option value="">Featured</option>
        {SORT_OPTIONS.filter((o) => o.value !== "featured").map((o) => (
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
            {paginationEl}
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
          {paginationEl}
        </div>
      )}
    </div>
  );
}
