"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { rupiah } from "@/lib/format";
import { adminPreorderReady, adminCancelPreorder, adminDeletePreorder } from "@/app/dashboard/actions";

// Aksi admin per pesanan pre-order.
export default function PreorderOrderActions({ id, status, defaultKekurangan }: { id: string; status: string; defaultKekurangan: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kurang, setKurang] = useState(defaultKekurangan);
  const run = (fn: () => Promise<void>) => start(async () => { await fn(); router.refresh(); });

  if (status === "DP_PAID") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          value={kurang}
          min={1}
          step={1000}
          onChange={(e) => setKurang(Math.floor(Number(e.target.value) || 0))}
          className="w-32 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs outline-none focus:border-primary"
          title="Nominal kekurangan (default total − DP)"
        />
        <button
          onClick={() => { if (kurang > 0 && confirm(`Kirim info pelunasan ${rupiah(kurang)} ke WhatsApp customer?`)) run(() => adminPreorderReady(id, kurang)); }}
          disabled={pending}
          className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
        >
          Barang Ready → Kirim Pelunasan
        </button>
        <button
          onClick={() => { if (confirm("Batalkan pesanan pre-order ini?")) run(() => adminCancelPreorder(id)); }}
          disabled={pending}
          className="rounded-md border px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:border-red-400 hover:text-red-600 disabled:opacity-50"
        >
          Batalkan
        </button>
      </div>
    );
  }

  if (status === "PENDING_DP" || status === "WAITING_LUNAS") {
    return (
      <button
        onClick={() => { if (confirm("Batalkan pesanan pre-order ini?")) run(() => adminCancelPreorder(id)); }}
        disabled={pending}
        className="rounded-md border px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:border-red-400 hover:text-red-600 disabled:opacity-50"
      >
        Batalkan
      </button>
    );
  }

  if (status === "CANCELLED" || status === "LUNAS") {
    return (
      <button
        onClick={() => { if (confirm("Hapus pesanan ini permanen?")) run(() => adminDeletePreorder(id)); }}
        disabled={pending}
        className="rounded-md border px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:border-red-400 hover:text-red-600 disabled:opacity-50"
      >
        Hapus
      </button>
    );
  }

  return null;
}
