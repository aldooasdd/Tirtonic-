"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDemoPhoto } from "@/app/komunitas/actions";

// Kompres di klien: sisi terpanjang 1600px, jpeg 0.75 → muat di batas body server action.
async function toJpeg(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const k = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.75);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Upload foto kegiatan (wajib setelah produk dikembalikan). Bisa pilih banyak sekaligus, dikirim satu-satu. */
export default function DemoPhotoUpload({ claimId, photos }: { claimId: string; photos: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [progress, setProgress] = useState("");

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 10 - photos.length);
    e.target.value = "";
    if (!files.length) return;
    setMsg("");
    start(async () => {
      for (const [i, f] of files.entries()) {
        setProgress(`${i + 1}/${files.length}`);
        try {
          const r = await addDemoPhoto(claimId, await toJpeg(f));
          if (r.error) { setMsg(r.error); break; }
        } catch {
          setMsg("Foto gagal diunggah, coba lagi."); break;
        }
      }
      setProgress("");
      router.refresh();
    });
  }

  const done = photos.length > 0;
  return (
    <div className={`mt-3 rounded-xl border p-3 ${done ? "border-emerald-200 bg-emerald-50/60" : "border-amber-300 bg-amber-50"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className={`text-xs font-[600] ${done ? "text-emerald-800" : "text-amber-800"}`}>
          {done ? `✓ ${photos.length} foto kegiatan terunggah` : "Wajib: upload foto kegiatan"}
        </p>
        {photos.length < 10 && (
          <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-[600] text-white transition ${pending ? "bg-neutral-400" : "bg-neutral-950 hover:bg-neutral-800"}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5" /><path d="M12 3v12" /></svg>
            {pending ? `Mengunggah ${progress}…` : done ? "Tambah foto" : "Upload foto kegiatan"}
            <input type="file" accept="image/*" multiple className="hidden" disabled={pending} onChange={onPick} />
          </label>
        )}
      </div>
      {!done && <p className="mt-1 text-[11px] text-amber-700">Belum upload = tidak bisa klaim / ambil produk demo berikutnya.</p>}
      {done && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {photos.map((u) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={u} src={u} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
          ))}
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-red-600">{msg}</p>}
    </div>
  );
}
