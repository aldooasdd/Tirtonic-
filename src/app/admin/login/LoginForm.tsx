"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login, LoginState } from "../actions";

const initial: LoginState = { error: "" };

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-green w-full disabled:opacity-60">
      {pending ? "..." : "Masuk"}
    </button>
  );
}

export default function LoginForm() {
  const [state, action] = useFormState(login, initial);
  return (
    <form action={action} className="space-y-4">
      {state.error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <input name="password" type="password" required autoFocus placeholder="Password" className="field" />
      <Btn />
    </form>
  );
}
