"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { submitCoachApplication } from "@/app/riwayat/coach-actions";

// Popup daftar Green Card: nama, club yang dilatih, foto bukti coach. Masuk antrian acc admin.
export default function CoachApplySheet({ phone, defaultName }: { phone: string; defaultName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [nama, setNama] = useState(defaultName);
  const [club, setClub] = useState("");
  const [foto, setFoto] = useState("");
  const [msg, setMsg] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Kompres di klien: sisi terpanjang 1280px, jpeg 0.7 (~100-250KB) — cukup buat baca sertifikat.
  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = url;
      });
      const k = Math.min(1, 1280 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      setFoto(c.toDataURL("image/jpeg", 0.7));
      setMsg("");
    } catch {
      setMsg("Foto gagal dibaca.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function submit() {
    if (!nama.trim()) return setMsg("Nama wajib diisi.");
    if (!club.trim()) return setMsg("Club wajib diisi.");
    if (!foto) return setMsg("Foto bukti wajib diunggah.");
    start(async () => {
      const r = await submitCoachApplication(phone, nama, club, foto);
      if (!r.ok) return setMsg(r.error ?? "Gagal kirim.");
      setOpen(false);
      router.refresh();
    });
  }

  const field = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600";

  return (
    <>
      <button type="button" onClick={() => { setMsg(""); setOpen(true); }} className="w-full rounded-xl bg-[#004328] py-3 text-sm font-bold text-white shadow-sm active:scale-[0.98]">
        Daftar Green Card
      </button>

      {mounted && createPortal(
        <div className={`fixed inset-0 z-[100] ${open ? "" : "pointer-events-none"}`}>
          <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-black/50 backdrop-blur-md transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />
          <div className={`absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-3xl bg-white shadow-2xl transition-transform duration-300 ${open ? "translate-y-0" : "translate-y-full"}`}>
            <div className="relative flex items-center justify-between px-5 py-3">
              <button onClick={() => setOpen(false)} className="text-sm font-medium text-slate-500">Batal</button>
              <h2 className="absolute left-1/2 -translate-x-1/2 text-base font-extrabold text-slate-900">Daftar Green Card</h2>
              <button onClick={submit} disabled={pending} className="text-sm font-bold text-emerald-700 disabled:opacity-50">{pending ? "..." : "Kirim"}</button>
            </div>
            <div className="max-h-[75vh] space-y-4 overflow-y-auto px-5 pb-8 pt-1">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-600">Nama Lengkap</span>
                <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama kamu" className={field} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-600">Club yang dilatih</span>
                <input value={club} onChange={(e) => setClub(e.target.value)} placeholder="mis. PTL Surabaya" className={field} />
              </label>
              <div>
                <span className="mb-1 block text-xs font-semibold text-slate-600">Bukti pelatih (sertifikat / foto melatih)</span>
                <label className="flex min-h-[140px] cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
                  {foto ? <img src={foto} alt="Bukti" className="max-h-64 w-full object-contain" /> : <span className="text-sm text-slate-400">Ketuk untuk unggah foto</span>}
                  <input type="file" accept="image/*" className="hidden" onChange={onPick} />
                </label>
              </div>
              {msg && <p className="text-sm font-medium text-rose-600">{msg}</p>}
              <p className="text-[11px] text-slate-400">Tim kurasi Tirtonic akan memverifikasi. Kamu dapat notifikasi WhatsApp setelah disetujui.</p>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
