"use client";

import { useFormStatus } from "react-dom";

// Tombol submit form yang terkunci selama aksi jalan — cegah klik dobel (mis. WA kekirim 2x saat lemot).
export default function SubmitButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${className ?? ""} disabled:cursor-wait disabled:opacity-60`}>
      {pending ? "Memproses…" : children}
    </button>
  );
}
