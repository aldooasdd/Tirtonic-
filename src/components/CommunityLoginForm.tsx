"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginCommunity, FormState } from "@/app/komunitas/actions";

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-green w-full py-3 disabled:opacity-60">
      {pending ? "Masuk…" : "Masuk"}
    </button>
  );
}

export default function CommunityLoginForm() {
  const [state, action] = useFormState<FormState, FormData>(loginCommunity, {});
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label">Password</label>
        <input name="password" type="password" required className="field" placeholder="••••••••" />
        <p className="mt-1 text-xs text-gray-400">Password dikirim ke WhatsApp PIC saat daftar.</p>
      </div>
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <Btn />
    </form>
  );
}
