"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { rupiah } from "@/lib/format";
import { adminPreorderReady, adminPreorderArrived, adminPreorderShipped, adminCancelPreorder, adminDeletePreorder } from "@/app/dashboard/actions";

// Aksi admin per pesanan pre-order. Alur mengikuti template WA (bagian C).
export default function PreorderOrderActions({ id, status, defaultKekurangan, arrived, pickup, resi, kurir }: {
  id: string; status: string; defaultKekurangan: number; arrived?: boolean; pickup?: boolean; resi?: string | null; kurir?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kurang, setKurang] = useState(defaultKekurangan);
  const [resiVal, setResiVal] = useState(resi ?? "");
  const [kurirVal, setKurirVal] = useState(kurir ?? "");
  const run = (fn: () => Promise<void>) => start(async () => { await fn(); router.refresh(); });

  const batal = (
    <button
      onClick={() => { if (confirm("Batalkan pesanan pre-order ini?")) run(() => adminCancelPreorder(id)); }}
      disabled={pending}
      className="rounded-md border px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:border-red-400 hover:text-red-600 disabled:opacity-50"
    >
      Batalkan
    </button>
  );

  if (status === "DP_PAID") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number" value={kurang} min={1} step={1000}
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
        {batal}
      </div>
    );
  }

  if (status === "LUNAS") {
    // Barang belum ditandai tiba (pembeli bayar penuh di awal) → kirim notif #3 dulu.
    if (!arrived) {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { if (confirm("Kirim notifikasi barang tiba ke WhatsApp customer?")) run(() => adminPreorderArrived(id)); }}
            disabled={pending}
            className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
          >
            Barang Tiba → Notif Customer
          </button>
          {batal}
        </div>
      );
    }
    // Barang sudah tiba → input resi (pengiriman) atau tandai diambil (pickup).
    if (pickup) {
      return (
        <button
          onClick={() => { if (confirm("Tandai pesanan sudah diambil customer?")) run(() => adminPreorderShipped(id, "")); }}
          disabled={pending}
          className="rounded-md border border-gray-400 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
        >
          Tandai Sudah Diambil
        </button>
      );
    }
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input value={kurirVal} onChange={(e) => setKurirVal(e.target.value)} placeholder="Kurir (JNE/J&T…)" className="w-28 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs outline-none focus:border-primary" />
        <input value={resiVal} onChange={(e) => setResiVal(e.target.value)} placeholder="No. resi" className="w-36 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs outline-none focus:border-primary" />
        <button
          onClick={() => { if (resiVal.trim() && confirm("Kirim info resi ke WhatsApp customer?")) run(() => adminPreorderShipped(id, resiVal, kurirVal)); }}
          disabled={pending || !resiVal.trim()}
          className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
        >
          Kirim → Tandai Dikirim
        </button>
      </div>
    );
  }

  if (status === "PENDING_DP" || status === "WAITING_LUNAS") return batal;

  if (status === "CANCELLED" || status === "SHIPPED") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {status === "SHIPPED" && resi && <span className="text-xs text-gray-500">Resi: <span className="font-mono font-semibold text-gray-900">{resi}</span>{kurir ? ` · ${kurir}` : ""}</span>}
        <button
          onClick={() => { if (confirm("Hapus pesanan ini permanen?")) run(() => adminDeletePreorder(id)); }}
          disabled={pending}
          className="rounded-md border px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:border-red-400 hover:text-red-600 disabled:opacity-50"
        >
          Hapus
        </button>
      </div>
    );
  }

  return null;
}
