"use client";

import { useFormState, useFormStatus } from "react-dom";
import { joinEvent, JoinState } from "@/app/event/actions";

function Btn({ wait }: { wait: boolean }) {
  const { pending } = useFormStatus();
  return wait ? (
    <button type="submit" disabled={pending} className="ev-btn inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-950 py-3.5 text-sm font-[700] text-lime-300 transition hover:bg-neutral-800 active:scale-[0.98] disabled:opacity-60">
      {pending ? "Mengirim…" : <>Daftar Antrean Waiting List <span aria-hidden>→</span></>}
    </button>
  ) : (
    <button type="submit" disabled={pending} className="ev-btn inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#173f2f] to-emerald-700 py-3.5 text-sm font-[700] text-white transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60">
      {pending ? "Mengirim…" : <>Join Sesi Ini <span aria-hidden>→</span></>}
    </button>
  );
}

/** waitlist (angka antrean saat ini) diisi → mode Waiting List (slot penuh). */
export default function JoinEventForm({ claimId, waitlist }: { claimId: string; waitlist?: number }) {
  const wait = waitlist !== undefined;
  const [state, action] = useFormState<JoinState, FormData>(joinEvent, {});

  if (state.ok && state.waitlist) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
        <p className="font-bold text-amber-800">Kamu masuk waiting list ⏳</p>
        <p className="mt-1 text-sm text-amber-700">Antrean ke-{state.waitlist}. Konfirmasi dikirim via WhatsApp kalau panitia menyetujui saat ada slot.</p>
      </div>
    );
  }
  if (state.ok) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center">
        <p className="font-bold text-green-700">Pendaftaran terkirim! 🎾</p>
        <p className="mt-1 text-sm text-green-600">Panitia komunitas akan mengonfirmasi lewat WhatsApp kamu.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="claimId" value={claimId} />
      {wait && (
        <div className="flex gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-800">
          <span aria-hidden>ⓘ</span>
          <p><b>Antrean saat ini: {waitlist} orang.</b> Konfirmasi dikirim via WhatsApp saat panitia menyetujui giliranmu.</p>
        </div>
      )}
      <div>
        <label className="mb-1.5 block text-xs font-[600] text-neutral-700">Nama Lengkap</label>
        <input name="name" required className="w-full rounded-xl border border-neutral-200/80 bg-white/70 px-3.5 py-3 text-sm placeholder-neutral-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" placeholder="Contoh: Budi Pratama" />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-[600] text-neutral-700">Nomor WhatsApp</label>
        <input name="phone" required inputMode="numeric" className="w-full rounded-xl border border-neutral-200/80 bg-white/70 px-3.5 py-3 text-sm placeholder-neutral-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" placeholder="0812xxxxxxxx" />
      </div>
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <Btn wait={wait} />
    </form>
  );
}
