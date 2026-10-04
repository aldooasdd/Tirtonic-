"use client";

import { useFormState, useFormStatus } from "react-dom";
import { stringerLogin } from "@/app/stringer/actions";

type StringerLoginState = { error?: string };

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-green w-full py-3 disabled:opacity-50">
      {pending ? "Masuk…" : "Masuk"}
    </button>
  );
}

export default function StringerLogin() {
  const [state, action] = useFormState<StringerLoginState, FormData>(stringerLogin, {});
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form action={action} className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
        <div className="mb-5 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Tirtonic" className="mx-auto h-12 w-12" />
          <h1 className="mt-3 text-xl font-extrabold text-gray-900">Stringer Tirtonic</h1>
          <p className="mt-1 text-sm text-gray-500">Masuk untuk memulai String Finder.</p>
        </div>
        <label className="label">Password</label>
        <input name="password" type="password" autoFocus className="field" placeholder="••••••••" />
        {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
        <div className="mt-5">
          <SubmitBtn />
        </div>
      </form>
    </div>
  );
}
