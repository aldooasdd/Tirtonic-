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
  const [discType, setDiscType] = useState<"percent" | "amount">("percent");
  const [scope, setScope] = useState<"all" | "products">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const categories = [...new Set(products.map((p) => p.kategori).filter(Boolean))].sort();

  // Reset form setelah berhasil simpan.
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setDiscType("percent");
      setScope("all");
      setSelected(new Set());
      setQ("");
      setCat("");
    }
  }, [state]);

  const query = q.trim().toLowerCase();
  const shown = products.filter(
    (p) =>
      (!cat || p.kategori === cat) &&
      (!query || p.nama.toLowerCase().includes(query) || p.kategori.toLowerCase().includes(query))
  );
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
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="value">Besar potongan {discType === "percent" ? "(%)" : "(Rp)"} *</label>
            {/* Switch tipe potongan: persen atau rupiah */}
            <div className="mb-1 inline-flex overflow-hidden rounded-full border border-gray-300 text-xs">
              <button type="button" onClick={() => setDiscType("percent")} className={discType === "percent" ? "bg-primary px-3 py-1 font-semibold text-white" : "px-3 py-1 text-gray-500"}>%</button>
              <button type="button" onClick={() => setDiscType("amount")} className={discType === "amount" ? "bg-primary px-3 py-1 font-semibold text-white" : "px-3 py-1 text-gray-500"}>Rp</button>
            </div>
          </div>
          <input type="hidden" name="type" value={discType} />
          <input
            id="value"
            name="value"
            type="number"
            min={1}
            max={discType === "percent" ? 100 : undefined}
            required
            placeholder={discType === "percent" ? "10" : "25000"}
            className="field"
          />
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
      </fieldset>

      {scope === "products" && (
        <div className="rounded-xl border p-3">
          {/* hidden inputs = yang benar-benar dikirim (tetap terkirim walau tersaring dari pencarian) */}
          {[...selected].map((id) => <input key={id} type="hidden" name="productIds" value={id} />)}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari produk…" className="field min-w-[8rem] flex-1 py-1.5 text-sm" />
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="field w-auto py-1.5 text-sm">
              <option value="">Semua kategori</option>
              {categories.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <span className="whitespace-nowrap text-xs text-gray-400">{selected.size} dipilih</span>
          </div>
          {cat && shown.length > 0 && (
            <button
              type="button"
              onClick={() => setSelected((s) => { const n = new Set(s); shown.forEach((p) => n.add(p.id)); return n; })}
              className="mb-2 text-xs font-semibold text-primary hover:underline"
            >
              Pilih semua di kategori &quot;{cat}&quot;
            </button>
          )}
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
