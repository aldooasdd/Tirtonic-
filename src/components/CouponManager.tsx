"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { CouponState } from "@/app/dashboard/actions";

type Prod = { id: string; nama: string; kategori: string };
type Action = (prev: CouponState, fd: FormData) => Promise<CouponState>;

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="btn-green disabled:opacity-60">
      {pending ? "Menyimpan..." : "Buat Kupon"}
    </button>
  );
}

export default function CouponManager({ action, products }: { action: Action; products: Prod[] }) {
  const [state, formAction] = useFormState<CouponState, FormData>(action, {});
  const [scope, setScope] = useState<"all" | "products">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Reset form setelah berhasil simpan.
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setScope("all");
      setSelected(new Set());
      setQ("");
    }
  }, [state]);

  const query = q.trim().toLowerCase();
  const shown = query ? products.filter((p) => p.nama.toLowerCase().includes(query) || p.kategori.toLowerCase().includes(query)) : products;
  const toggle = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="code">Kode kupon *</label>
          <input id="code" name="code" required placeholder="HEMAT10" className="field uppercase" style={{ textTransform: "uppercase" }} />
        </div>
        <div>
          <label className="label" htmlFor="value">Besar potongan (%) *</label>
          <input id="value" name="value" type="number" min={1} max={100} required placeholder="10" className="field" />
        </div>
      </div>

      <fieldset>
        <legend className="label">Berlaku untuk</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="scope" value="all" checked={scope === "all"} onChange={() => setScope("all")} />
            Semua produk
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="scope" value="products" checked={scope === "products"} onChange={() => setScope("products")} />
            Produk tertentu
          </label>
        </div>
        <p className="mt-1 text-xs text-gray-400">Produk yang sedang diskon tidak pernah kena potongan kupon.</p>
      </fieldset>

      {scope === "products" && (
        <div className="rounded-xl border p-3">
          {/* hidden inputs = yang benar-benar dikirim (tetap terkirim walau tersaring dari pencarian) */}
          {[...selected].map((id) => <input key={id} type="hidden" name="productIds" value={id} />)}
          <div className="mb-2 flex items-center justify-between gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari produk…" className="field flex-1 py-1.5 text-sm" />
            <span className="whitespace-nowrap text-xs text-gray-400">{selected.size} dipilih</span>
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {shown.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">Tidak ada produk cocok.</p>
            ) : (
              shown.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                  <span className="min-w-0 flex-1 truncate text-gray-800">{p.nama}</span>
                  <span className="shrink-0 text-xs text-gray-400">{p.kategori}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <SubmitBtn />
    </form>
  );
}
