"use client";
import { useState, useTransition } from "react";
import { sinkronGoogle } from "./actions";
import { btnPrimary } from "@/components/dashboard/ui";

export default function SyncButton() {
  const [pending, start] = useTransition();
  const [hasil, setHasil] = useState<string>("");
  return (
    <div className="flex flex-col items-end gap-1">
      <button className={btnPrimary} disabled={pending}
        onClick={() => start(async () => {
          try {
            const r = await sinkronGoogle();
            setHasil(`Terkirim ${r.kirim}/${r.total}, dihapus ${r.hapus}${r.gagal.length ? `, gagal ${r.gagal.length}: ${r.gagal[0]}` : ""}`);
          } catch (e) { setHasil(`Gagal: ${(e as Error).message}`); }
        })}>
        {pending ? "Mengirim… (±2 menit)" : "Sinkron sekarang"}
      </button>
      {hasil && <p className="max-w-md text-right text-xs text-[#6B7A74]">{hasil}</p>}
    </div>
  );
}
