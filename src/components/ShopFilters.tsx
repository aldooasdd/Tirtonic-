"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SHOE_SIZES, KATEGORI, PRICE_RANGES } from "@/lib/constants";

function Chevron() {
  return (
    <svg
      className="h-4 w-4 text-gray-400 transition group-open:rotate-180"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details open className="group border-b py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold text-gray-900">
        {title}
        <Chevron />
      </summary>
      <div className="pt-4">{children}</div>
    </details>
  );
}

export default function ShopFilters({ brands }: { brands: string[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const cur = (k: string) => sp.get(k) || "";

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    if (next.get(key) === value) next.delete(key);
    else next.set(key, value);
    router.push(`/shop?${next.toString()}`);
  }

  const radio =
    "flex cursor-pointer items-center gap-2 py-1 text-sm text-gray-600 hover:text-gray-900";

  return (
    <div className="border-t">
      <Section title="Brand">
        {brands.length === 0 && <p className="text-xs text-gray-400">Belum ada brand.</p>}
        {brands.map((b) => (
          <label key={b} className={radio}>
            <input type="checkbox" checked={cur("brand") === b} onChange={() => setParam("brand", b)} />
            {b}
          </label>
        ))}
      </Section>

      <Section title="Size">
        <div className="grid grid-cols-4 gap-2">
          {SHOE_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setParam("size", s)}
              className={`rounded-full border px-1 py-1.5 text-xs ${
                cur("size") === s ? "border-primary bg-primary text-white" : "border-gray-300 text-gray-500"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Price Range">
        {PRICE_RANGES.map((r) => (
          <label key={r.value} className={radio}>
            <input type="radio" name="price" checked={cur("price") === r.value} onChange={() => setParam("price", r.value)} />
            {r.label}
          </label>
        ))}
      </Section>

      <Section title="Category">
        {KATEGORI.map((c) => (
          <label key={c} className={radio}>
            <input type="checkbox" checked={cur("type") === c} onChange={() => setParam("type", c)} />
            {c}
          </label>
        ))}
      </Section>
    </div>
  );
}
