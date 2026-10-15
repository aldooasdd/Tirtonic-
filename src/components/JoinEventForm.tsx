"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { joinEvent, JoinState } from "@/app/event/actions";

export type SessionSlot = { index: number; time: string; sisa: number; full: boolean };

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-green w-full py-3 disabled:opacity-60">
      {pending ? "Mengirim…" : "Join acara ini"}
    </button>
  );
}

export default function JoinEventForm({ claimId, sessions }: { claimId: string; sessions: SessionSlot[] }) {
  const [state, action] = useFormState<JoinState, FormData>(joinEvent, {});
  const firstOpen = sessions.find((s) => !s.full);
  const [picked, setPicked] = useState<number | null>(firstOpen ? firstOpen.index : null);

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
      <input type="hidden" name="sessionIndex" value={picked ?? ""} />

      <div>
        <label className="label">Pilih sesi *</label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {sessions.map((s) => (
            <button
              key={s.index}
              type="button"
              disabled={s.full}
              onClick={() => setPicked(s.index)}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                picked === s.index ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-gray-200"
              }`}
            >
              <span className="block font-bold text-gray-900">Sesi {s.index + 1} · {s.time}</span>
              <span className="block text-xs text-gray-500">{s.full ? "Penuh" : `Sisa ${s.sisa}`}</span>
            </button>
          ))}
        </div>
      </div>

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
