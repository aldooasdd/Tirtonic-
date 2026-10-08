"use client";

import { useRef, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { changePassword, type PasswordState } from "@/app/dashboard/actions";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="btn-pill w-full bg-primary hover:bg-primaryDark disabled:opacity-60">
      {pending ? "Menyimpan..." : "Simpan Kata Sandi Baru"}
    </button>
  );
}

export default function ChangePasswordForm() {
  const [state, formAction] = useFormState<PasswordState, FormData>(changePassword, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);

  return (
    <form ref={ref} action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="lama">Kata sandi lama</label>
        <input id="lama" name="lama" type="password" required autoComplete="current-password" className="field" />
      </div>
      <div>
        <label className="label" htmlFor="baru">Kata sandi baru (min. 6 karakter)</label>
        <input id="baru" name="baru" type="password" required minLength={6} autoComplete="new-password" className="field" />
      </div>
      <div>
        <label className="label" htmlFor="konfirmasi">Ulangi kata sandi baru</label>
        <input id="konfirmasi" name="konfirmasi" type="password" required minLength={6} autoComplete="new-password" className="field" />
      </div>
      {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Kata sandi berhasil diganti. Pakai yang baru saat login berikutnya.</p>}
      <SubmitBtn />
    </form>
  );
}
