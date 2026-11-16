"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { setCommunityLogo, type FormState } from "@/app/komunitas/actions";

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="ev-btn w-full rounded-xl bg-[#173f2f] py-3 text-sm font-[700] text-white hover:bg-[#0f2d21] disabled:opacity-60">
      {pending ? "Mengunggah…" : "Upload logo & verifikasi"}
    </button>
  );
}

/** Tombol "Verifikasi" di nav dashboard komunitas → popup checklist profil + upload logo. Lengkap = centang biru. */
export default function CommunityVerify({ checklist }: { checklist: { label: string; ok: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState<FormState, FormData>(setCommunityLogo, {});
  const [preview, setPreview] = useState<string | null>(null);
  const done = checklist.filter((c) => c.ok).length;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-[700] text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
        Verifikasi
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-end bg-black/40 backdrop-blur-sm sm:place-items-center sm:p-6" onClick={() => setOpen(false)}>
          <div className="sheet-in w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 shadow-2xl sm:rounded-3xl sm:pb-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-[700] uppercase tracking-wider text-sky-600">Verifikasi komunitas</p>
                <h3 className="mt-0.5 text-lg font-[700] text-neutral-950">Dapatkan centang biru <span className="text-sky-500">✓</span></h3>
                <p className="mt-1 text-xs text-neutral-500">Komunitas terverifikasi tampil dengan centang biru di halaman Event Tirtonic.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Tutup" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200">✕</button>
            </div>

            <div className="mt-4 rounded-2xl bg-neutral-50 p-3">
              <div className="mb-2 flex justify-between text-[11px] font-[600] text-neutral-500"><span>Kelengkapan profil</span><span>{done}/{checklist.length}</span></div>
              <ul className="space-y-1.5">
                {checklist.map((c) => (
                  <li key={c.label} className="flex items-center gap-2 text-sm">
                    <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-[800] ${c.ok ? "bg-emerald-500 text-white" : "bg-neutral-200 text-neutral-500"}`}>{c.ok ? "✓" : "!"}</span>
                    <span className={c.ok ? "text-neutral-700" : "font-[600] text-neutral-950"}>{c.label}</span>
                    {!c.ok && <span className="ml-auto text-[11px] text-amber-600">belum</span>}
                  </li>
                ))}
              </ul>
            </div>

            {state.ok ? (
              <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-center text-sm font-[600] text-emerald-700">Logo terunggah — komunitasmu sudah terverifikasi ✓</p>
            ) : (
              <form action={action} className="mt-4 space-y-3">
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-neutral-300 p-3 hover:border-emerald-500">
                  <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-neutral-100 text-[10px] text-neutral-400">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : "Logo"}
                  </span>
                  <span className="text-xs text-neutral-500"><b className="block text-sm text-neutral-900">Pilih logo komunitas</b>JPG/PNG, maks 3 MB, sebaiknya persegi.</span>
                  <input type="file" name="logo" accept="image/*" required className="hidden" onChange={(e) => { const f = e.target.files?.[0]; setPreview(f ? URL.createObjectURL(f) : null); }} />
                </label>
                {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
                <Btn />
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
