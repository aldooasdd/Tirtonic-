"use client";

import { useFormState, useFormStatus } from "react-dom";
import { registerCommunity, FormState } from "@/app/komunitas/actions";

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-green w-full py-3 disabled:opacity-60">
      {pending ? "Mendaftar…" : "Daftar komunitas"}
    </button>
  );
}

export default function CommunityRegisterForm() {
  const [state, action] = useFormState<FormState, FormData>(registerCommunity, {});
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label">Nama komunitas *</label>
        <input name="name" required className="field" placeholder="Komunitas Tenis Sleman" />
      </div>
      <div>
        <label className="label">Username Instagram *</label>
        <input name="instagram" required className="field" placeholder="tenis.sleman (tanpa @)" />
        <p className="mt-1 text-xs text-gray-400">Dipakai untuk login. Password otomatis dikirim ke WhatsApp.</p>
      </div>
      <div>
        <label className="label">Nomor WhatsApp penanggung jawab *</label>
        <input name="waPhone" required inputMode="numeric" className="field" placeholder="0812xxxxxxxx" />
      </div>
      <div>
        <label className="label">Logo komunitas (opsional)</label>
        <input name="logo" type="file" accept="image/*" className="text-sm" />
      </div>
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <Btn />
    </form>
  );
}
