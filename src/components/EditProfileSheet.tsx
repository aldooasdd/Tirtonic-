"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { saveProfile } from "@/app/riwayat/profile-actions";

// Edit profil — bottom sheet liquid glass, naik dari bawah. Trigger = tombol pensil di samping nama.
// Nomor WA tak bisa diganti. Tanggal lahir hanya bisa diisi sekali (kalau sudah ada → terkunci).
export default function EditProfileSheet({ phone, name, birthdayISO, waDisplay, tierLabel, photo, complete = false }: {
  phone: string; name: string; birthdayISO: string | null; waDisplay: string; tierLabel: string; photo: string | null; complete?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [nama, setNama] = useState(name);
  const [tgl, setTgl] = useState(birthdayISO ?? "");
  const [foto, setFoto] = useState<string>(photo ?? "");
  const [msg, setMsg] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const lockedBirthday = !!birthdayISO;

  // Kompres foto di klien: center-crop kotak, resize 256px, jpeg 0.7 (~15-30KB).
  async function onPickFoto(e: React.ChangeEvent<HTMLInputElement>) {
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
      const S = 256;
      const side = Math.min(img.width, img.height);
      const c = document.createElement("canvas");
      c.width = S; c.height = S;
      c.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S);
      setFoto(c.toDataURL("image/jpeg", 0.7));
    } catch {
      setMsg("Foto gagal dibaca.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function close() { setOpen(false); setMsg(""); }
  function submit() {
    if (!nama.trim()) { setMsg("Nama wajib diisi."); return; }
    start(async () => {
      const r = await saveProfile(phone, nama, lockedBirthday ? "" : tgl, foto || undefined);
      if (!r.ok) { setMsg(r.error ?? "Gagal simpan."); return; }
      router.refresh();
      setOpen(false);
    });
  }

  const statusShort = tierLabel.replace(/^Tirtonic /, "").replace(/ Card$/, "").toUpperCase() + " CARD";

  return (
    <>
      <button
        type="button"
        aria-label="Edit profil"
        onClick={() => { setNama(name); setTgl(birthdayISO ?? ""); setFoto(photo ?? ""); setOpen(true); }}
        className={complete
          ? "inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition active:scale-95"
          : "inline-flex h-7 items-center gap-1 rounded-full border border-rose-200 bg-rose-50 pl-2.5 pr-2 text-rose-600 shadow-sm transition active:scale-95"}
      >
        {!complete && <span className="text-[11px] font-semibold">Verifikasi</span>}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
      </button>

      {/* Sheet — portal ke body biar lepas dari stacking context header (z-10) & bawah nav (z-20) */}
      {mounted && createPortal(
      <div className={`fixed inset-0 z-[100] ${open ? "" : "pointer-events-none"}`}>
        <div onClick={close} className={`absolute inset-0 bg-black/50 backdrop-blur-md transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />
        <div className={`absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-3xl border border-white/50 bg-white/95 shadow-[0_-16px_48px_-12px_rgba(0,0,0,0.3)] backdrop-blur-2xl transition-transform duration-300 ${open ? "translate-y-0" : "translate-y-full"}`}>
          <div className="flex items-center justify-between px-5 pb-3 pt-3">
            <button onClick={close} className="text-sm font-medium text-slate-500">Batal</button>
            <span className="mx-auto h-1 w-10 -translate-y-1 rounded-full bg-slate-300" />
            <h2 className="absolute left-1/2 top-4 -translate-x-1/2 text-base font-extrabold text-slate-900">Edit Profil</h2>
            <button onClick={submit} disabled={pending} className="text-sm font-bold text-emerald-700 disabled:opacity-50">{pending ? "..." : "Simpan"}</button>
          </div>

          <div className="max-h-[70vh] space-y-5 overflow-y-auto px-5 pb-8 pt-2">
            {/* Foto Profil */}
            <div className="flex flex-col items-center gap-2 pt-1">
              <label className="relative cursor-pointer">
                <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700 ring-2 ring-white shadow-sm">
                  {foto ? <img src={foto} alt="" className="h-full w-full object-cover" /> : (nama.trim()[0]?.toUpperCase() ?? "?")}
                </span>
                <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-800 text-white shadow">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={onPickFoto} />
              </label>
              <p className="text-[11px] text-slate-400">Ketuk untuk ganti foto</p>
            </div>

            {/* Informasi Akun */}
            <div>
              <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Informasi Akun</p>
              <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70">
                <label className="flex items-center gap-3 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-800">Nama Lengkap</span>
                  <input
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Nama kamu"
                    className="ml-auto w-1/2 bg-transparent text-right text-sm text-slate-900 outline-none placeholder:text-slate-300"
                  />
                </label>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-800">Nomor WhatsApp</span>
                  <span className="ml-auto font-mono text-sm text-slate-500">{waDisplay}</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Valid</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-800">Status Member</span>
                  <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-slate-600">{statusShort}</span>
                </div>
              </div>
              <p className="mt-1.5 px-1 text-[11px] text-slate-400">Nomor WhatsApp tidak bisa diubah — dipakai sebagai identitas member.</p>
            </div>

            {/* Tanggal Lahir */}
            <div>
              <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Tanggal Lahir</p>
              <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Hari Ulang Tahun</p>
                    <p className="text-xs text-slate-500">Untuk hadiah voucher tahunan.</p>
                  </div>
                  <input
                    type="date"
                    value={tgl}
                    disabled={lockedBirthday}
                    onChange={(e) => setTgl(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className={`rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 ${lockedBirthday ? "cursor-not-allowed opacity-70" : ""}`}
                  />
                </div>
                <p className="mt-2 rounded-xl bg-emerald-50/70 px-3 py-2 text-[11px] leading-normal text-slate-600">
                  {lockedBirthday
                    ? "Tanggal lahir sudah dikunci dan tidak bisa diubah."
                    : "Voucher Ulang Tahun diskon & bonus poin dikirim otomatis tiap bulan kelahiran. Tanggal hanya bisa diisi sekali."}
                </p>
              </div>
            </div>

            {msg && <p className="px-1 text-center text-xs font-medium text-red-500">{msg}</p>}

            <button
              onClick={submit}
              disabled={pending}
              className="w-full rounded-2xl bg-emerald-800 py-3.5 text-sm font-bold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-50"
            >
              {pending ? "Menyimpan…" : "Simpan Perubahan"}
            </button>
          </div>
        </div>
      </div>,
      document.body)}
    </>
  );
}
