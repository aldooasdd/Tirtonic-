"use client";

import { useFormState, useFormStatus } from "react-dom";
import { joinEvent, JoinState } from "@/app/event/actions";

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-green w-full py-3 disabled:opacity-60">
      {pending ? "Mengirim…" : "Join acara ini"}
    </button>
  );
}

export default function JoinEventForm({ claimId }: { claimId: string }) {
  const [state, action] = useFormState<JoinState, FormData>(joinEvent, {});

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
      <div>
        <label className="label">Nama kamu</label>
        <input name="name" required className="field" placeholder="Nama lengkap" />
      </div>
      <div>
        <label className="label">Nomor WhatsApp</label>
        <input name="phone" required inputMode="numeric" className="field" placeholder="0812xxxxxxxx" />
      </div>
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <Btn />
    </form>
  );
}
