"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { setClaimQuota, addParticipantManual, type FormState } from "@/app/komunitas/actions";
import SubmitButton from "@/components/SubmitButton";

/** Atur slot (tambah/kurangi) + daftarkan peserta manual. Di kartu Demo Saya dashboard komunitas. */
export default function ParticipantAdmin({ claimId, quota, accepted }: { claimId: string; quota: number; accepted: number }) {
  const [qs, qAction] = useFormState<FormState, FormData>(setClaimQuota.bind(null, claimId), {});
  const [as, aAction] = useFormState<FormState, FormData>(addParticipantManual.bind(null, claimId), {});
  const addRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (as.ok) addRef.current?.reset(); }, [as]);
  const field = "min-w-0 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm focus:border-emerald-600 focus:outline-none";

  return (
    <details className="mt-3 rounded-2xl bg-white/70 p-3 ring-1 ring-black/[0.05]">
      <summary className="cursor-pointer text-xs font-[700] text-neutral-700">⚙️ Atur slot & tambah peserta</summary>
      <form action={qAction} className="mt-3 flex items-center gap-2">
        <span className="text-xs text-neutral-500">Slot peserta</span>
        <input name="quota" type="number" min={Math.max(1, accepted)} max={100} defaultValue={quota} required className={`${field} w-20`} />
        <SubmitButton className="rounded-lg bg-neutral-950 px-3 py-1.5 text-xs font-[600] text-white hover:bg-neutral-800">Simpan</SubmitButton>
        {qs.ok && <span className="text-xs text-emerald-700">✓</span>}
      </form>
      {qs.error && <p className="mt-1 text-xs text-red-600">{qs.error}</p>}

      <form ref={addRef} action={aAction} className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
        <input name="name" required placeholder="Nama peserta" className={field} />
        <input name="phone" required inputMode="tel" placeholder="No. WA" className={field} />
        <SubmitButton className="rounded-lg bg-[#173f2f] px-3 py-1.5 text-xs font-[600] text-white hover:bg-[#0f2d21]">Tambah</SubmitButton>
      </form>
      {as.error && <p className="mt-1 text-xs text-red-600">{as.error}</p>}
      {as.ok && <p className="mt-1 text-xs text-emerald-700">✓ Peserta ditambahkan & dapat WA konfirmasi.</p>}
      <p className="mt-2 text-[11px] text-neutral-400">Peserta yang ditambah di sini langsung diterima, tercatat, dan dapat voucher seperti daftar lewat web.</p>
    </details>
  );
}
