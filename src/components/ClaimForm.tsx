"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { claimDemo, FormState } from "@/app/komunitas/actions";

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-green w-full py-3 disabled:opacity-60">
      {pending ? "Mengirim…" : "Ajukan demo ke Tirtonic"}
    </button>
  );
}

export default function ClaimForm({ campaignId }: { campaignId: string }) {
  const [state, action] = useFormState<FormState, FormData>(claimDemo, {});
  const [quotaType, setQuotaType] = useState<"closed" | "open">("open");

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="campaignId" value={campaignId} />
      <input type="hidden" name="quotaType" value={quotaType} />

      <div>
        <label className="label">Lapangan tenis *</label>
        <input name="court" required className="field" placeholder="GOR / Lapangan ... , kota" />
      </div>

      <div>
        <label className="label">Tipe kuota peserta *</label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setQuotaType("open")}
            className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${quotaType === "open" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-gray-200"}`}
          >
            <span className="block font-bold text-gray-900">Open</span>
            <span className="block text-xs text-gray-500">Orang bisa join dari web</span>
          </button>
          <button
            type="button"
            onClick={() => setQuotaType("closed")}
            className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${quotaType === "closed" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-gray-200"}`}
          >
            <span className="block font-bold text-gray-900">Closed</span>
            <span className="block text-xs text-gray-500">Kuota fix dari komunitas</span>
          </button>
        </div>
      </div>

      <div>
        <label className="label">{quotaType === "open" ? "Maksimal peserta / sesi *" : "Jumlah peserta / sesi *"}</label>
        <input name="quota" required type="number" min={10} defaultValue={10} className="field" />
        <p className="mt-1 text-xs text-gray-400">Minimal 10 orang, berlaku per sesi.</p>
      </div>

      <div>
        <label className="label">Tanggal demo *</label>
        <input name="demoDate" required type="date" className="field" />
      </div>

      <div>
        <label className="label">4 sesi waktu demo *</label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {["08:00", "10:00", "13:00", "15:00"].map((t, i) => (
            <div key={i}>
              <span className="mb-0.5 block text-xs text-gray-400">Sesi {i + 1}</span>
              <input name={`session${i}`} required type="time" defaultValue={t} className="field" />
            </div>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-400">4 sesi dalam 1 hari, atur jamnya sesuai komunitasmu.</p>
      </div>

      <div>
        <label className="label">Nomor WhatsApp penanggung jawab acara *</label>
        <input name="eventPicPhone" required inputMode="numeric" className="field" placeholder="0812xxxxxxxx" />
      </div>

      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <Btn />
    </form>
  );
}
