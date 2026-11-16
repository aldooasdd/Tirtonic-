"use client";

import { useState } from "react";
import DemoPhotoUpload from "@/components/DemoPhotoUpload";

/** Badge di tabel Riwayat Demo → popup upload foto dokumentasi. */
export default function DemoPhotoBadge({ claimId, photos, title }: { claimId: string; photos: string[]; title: string }) {
  const [open, setOpen] = useState(false);
  const done = photos.length > 0;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-[600] transition active:scale-95 ${done ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "animate-pulse bg-amber-100 text-amber-800 hover:bg-amber-200"}`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
        {done ? `${photos.length} foto` : "Upload foto"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 backdrop-blur-sm sm:place-items-center sm:p-6" onClick={() => setOpen(false)}>
          <div className="sheet-in w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 shadow-2xl sm:rounded-3xl sm:pb-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-[600] uppercase tracking-wider text-neutral-500">Foto dokumentasi</p>
                <h3 className="mt-0.5 line-clamp-2 font-[600] leading-snug text-neutral-950">{title}</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Tutup" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200">✕</button>
            </div>
            <DemoPhotoUpload claimId={claimId} photos={photos} />
          </div>
        </div>
      )}
    </>
  );
}
