"use client";

import { useFormState, useFormStatus } from "react-dom";
import { setClaimQuota, type FormState } from "@/app/komunitas/actions";

function Step({ value, label, disabled }: { value: number; label: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      name="quota"
      value={value}
      disabled={disabled || pending}
      aria-label={label === "−" ? "Kurangi slot" : "Tambah slot"}
      className="grid h-9 w-9 place-items-center rounded-full bg-white text-lg font-[700] text-neutral-800 ring-1 ring-black/10 hover:bg-neutral-50 disabled:opacity-40"
    >
      {label}
    </button>
  );
}

/** Tambah / kurangi slot peserta (min = peserta yang sudah diterima). Di kartu Demo Saya dashboard komunitas. */
export default function ParticipantAdmin({ claimId, quota, accepted }: { claimId: string; quota: number; accepted: number }) {
  const [st, action] = useFormState<FormState, FormData>(setClaimQuota.bind(null, claimId), {});
  return (
    <form action={action} className="mt-3 rounded-2xl bg-white/70 p-3 ring-1 ring-black/[0.05]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-[700] text-neutral-700">Slot peserta</span>
        <div className="flex items-center gap-3">
          <Step value={quota - 1} label="−" disabled={quota - 1 < Math.max(1, accepted)} />
          <span className="min-w-[2ch] text-center text-base font-[700] text-neutral-950">{quota}</span>
          <Step value={quota + 1} label="+" disabled={quota >= 100} />
        </div>
      </div>
      {st.error && <p className="mt-1.5 text-xs text-red-600">{st.error}</p>}
    </form>
  );
}
