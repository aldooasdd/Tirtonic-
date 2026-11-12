"use client";

import { useFormState, useFormStatus } from "react-dom";
import { joinReferral } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="w-full rounded-2xl bg-emerald-800 py-3.5 text-sm font-bold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60">
      {pending ? "Mendaftarkan…" : "Daftar sebagai Murid"}
    </button>
  );
}

export default function JoinForm({ code }: { code: string }) {
  const [err, action] = useFormState(joinReferral, null);
  const field = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-emerald-600 focus:outline-none";
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="ref" value={code} />
      <input name="name" placeholder="Nama kamu" className={field} />
      <input name="phone" required inputMode="numeric" placeholder="No. WhatsApp (08…)" className={field} />
      {err && <p className="text-xs font-medium text-red-600">{err}</p>}
      <Submit />
    </form>
  );
}
