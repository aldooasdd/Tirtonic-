"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adminMarkPaid, adminMarkShipped, adminCancelOrder } from "@/app/dashboard/actions";

export default function OrderRowActions({ id, status, kurir }: { id: string; status: string; kurir: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [resi, setResi] = useState("");

  const run = (fn: () => Promise<void>) => start(async () => { await fn(); router.refresh(); });

  if (status === "PENDING") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => run(() => adminMarkPaid(id))}
          disabled={pending}
          className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
        >
          Tandai Lunas
        </button>
        <button
          onClick={() => { if (confirm("Batalkan pesanan ini?")) run(() => adminCancelOrder(id)); }}
          disabled={pending}
          className="rounded-md border px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:border-red-400 hover:text-red-600 disabled:opacity-50"
        >
          Batalkan
        </button>
      </div>
    );
  }

  if (status === "PAID") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={resi}
          onChange={(e) => setResi(e.target.value)}
          placeholder="No. resi"
          className="w-36 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs outline-none focus:border-primary"
        />
        <button
          onClick={() => { if (resi.trim()) run(() => adminMarkShipped(id, resi.trim(), kurir)); }}
          disabled={pending || !resi.trim()}
          className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
        >
          Kirim + Kirim Resi
        </button>
      </div>
    );
  }

  return null;
}
