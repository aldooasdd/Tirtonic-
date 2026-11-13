"use client";

import { AJUKAN_DEMO_ON } from "@/lib/demo-products";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useFormState, useFormStatus } from "react-dom";
import { registerCommunity, loginCommunity, type FormState } from "@/app/komunitas/actions";
import { requestDemo } from "@/app/event/actions";

const EVT = "komunitas:open";

/** Link ke /komunitas yang membuka popup (tanpa JS tetap jalan sebagai link biasa). Sudah login → langsung ke dashboard. */
export function KomunitasTrigger({ loggedIn, context, className, children }: { loggedIn?: boolean; context?: string; className?: string; children: React.ReactNode }) {
  return (
    <a
      href="/komunitas"
      className={className}
      onClick={(e) => {
        if (loggedIn) return;
        e.preventDefault();
        window.dispatchEvent(new CustomEvent(EVT, { detail: context ?? "" }));
      }}
    >
      {children}
    </a>
  );
}

function Submit({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="ev-btn w-full rounded-2xl border border-white/10 bg-neutral-950 py-3.5 text-sm font-[600] text-white transition hover:bg-neutral-800 active:scale-[0.99] disabled:opacity-60">
      {pending ? busy : label}
    </button>
  );
}

const field = "w-full rounded-2xl border border-black/[0.06] bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";
const label = "mb-1.5 block text-xs font-[600] text-neutral-700";

function RegisterForm() {
  const [state, action] = useFormState<FormState, FormData>(registerCommunity, {});
  if (state.ok) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-base font-[600] text-emerald-800">Pendaftaran terkirim! 🎾</p>
        <p className="mt-1 text-sm text-emerald-700">Akun sedang ditinjau admin Tirtonic. Password login dikirim ke WhatsApp PIC begitu disetujui.</p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className={label}>Nama Komunitas Tenis</label>
        <input name="name" required className={field} placeholder="Cth: Semarang Tennis Club" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Username Instagram</label>
          <input name="instagram" required className={field} placeholder="tenis.sleman (tanpa @)" />
        </div>
        <div>
          <label className={label}>No. WhatsApp PIC / Kapten</label>
          <input name="waPhone" required inputMode="numeric" className={field} placeholder="0812-xxxx-xxxx" />
        </div>
      </div>
      <div>
        <label className={label}>Logo komunitas <span className="font-[400] text-neutral-400">(opsional)</span></label>
        <input name="logo" type="file" accept="image/*" className="block w-full text-xs text-neutral-500 file:mr-3 file:rounded-full file:border-0 file:bg-neutral-100 file:px-4 file:py-2 file:text-xs file:font-[600] file:text-neutral-800 hover:file:bg-neutral-200" />
      </div>
      {state.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <Submit label="Daftarkan Komunitas & Klaim Demo" busy="Mendaftar…" />
      <p className="text-center text-[11px] text-neutral-400">Password login dibuat otomatis & dikirim ke WhatsApp setelah disetujui admin.</p>
    </form>
  );
}

function LoginForm() {
  const [state, action] = useFormState<FormState, FormData>(loginCommunity, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className={label}>Password</label>
        <input name="password" type="password" required className={field} placeholder="••••••••" autoComplete="current-password" />
        <p className="mt-1.5 text-[11px] text-neutral-400">Password dikirim ke WhatsApp PIC saat akun disetujui.</p>
      </div>
      {state.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <Submit label="Masuk ke Dashboard Komunitas" busy="Masuk…" />
    </form>
  );
}


/** Kerangka popup: tengah di desktop (zoom halus), sheet naik dari bawah di HP. */
function Sheet({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!mounted) return null;
  return createPortal(
    <div className={`fixed inset-0 z-[100] ${open ? "" : "pointer-events-none"}`} role="dialog" aria-modal="true" aria-label={label}>
      <div onClick={onClose} className={`absolute inset-0 bg-black/45 backdrop-blur-md transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />
      <div
        className={`absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-[28px] bg-[#f4f4f5] shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90vh] sm:w-[min(640px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:rounded-[28px] ${
          open ? "translate-y-0 sm:-translate-y-1/2 sm:scale-100 sm:opacity-100" : "translate-y-full sm:-translate-y-[46%] sm:scale-95 sm:opacity-0"
        }`}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-neutral-300 sm:hidden" />
        <div className="relative p-5 pb-8 sm:p-9">
          <button type="button" onClick={onClose} aria-label="Tutup" className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-black/[0.06] bg-white/80 text-neutral-700 transition hover:bg-white sm:right-6 sm:top-6">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>

          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Popup "Join as komunitas": tengah di desktop, sheet dari bawah di HP. Pasang sekali per halaman. */
export default function KomunitasSheet() {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState("");
  const [tab, setTab] = useState<"daftar" | "login">("daftar");
  useEffect(() => {
    const on = (e: Event) => { setContext((e as CustomEvent<string>).detail); setOpen(true); };
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  const choice = (key: "daftar" | "login", title: string, desc: string, icon: React.ReactNode) => {
    const on = tab === key;
    return (
      <button
        type="button"
        onClick={() => setTab(key)}
        className={`relative rounded-2xl border-2 bg-white p-4 text-left outline-none transition-all duration-300 sm:p-5 ${on ? "border-emerald-500 shadow-[0_12px_30px_-12px_rgba(16,185,129,0.35)]" : "border-transparent shadow-[0_4px_16px_-6px_rgba(0,0,0,0.08)] hover:border-black/[0.06]"}`}
      >
        <span className={`absolute right-4 top-4 h-2.5 w-2.5 rounded-full transition ${on ? "bg-emerald-500" : "bg-neutral-300"}`} />
        <span className={`mb-3 grid h-10 w-10 place-items-center rounded-xl border sm:h-12 sm:w-12 ${on ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-black/[0.06] bg-neutral-100 text-neutral-800"}`}>{icon}</span>
        <p className={`text-[15px] font-[600] sm:text-lg ${on ? "text-emerald-800" : "text-neutral-950"}`}>{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-neutral-500 sm:text-sm">{desc}</p>
      </button>
    );
  };

  return (
    <Sheet open={open} onClose={() => setOpen(false)} label="Join as komunitas">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-[600] text-emerald-700">
        <span className="h-2 w-2 rounded-full bg-emerald-600" /> Untuk komunitas tenis
      </span>
      <h2 className="mt-4 text-3xl font-[600] tracking-tight text-neutral-950 sm:text-4xl">Join as komunitas</h2>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600 sm:text-base">Bawa demo produk brand tenis ke komunitasmu. Daftarkan komunitas atau login untuk mulai.</p>
      {context && (
        <span className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3.5 py-1.5 text-xs text-neutral-700">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-emerald-600" aria-hidden><path d="M12 21s-7-4.35-7-10a7 7 0 0 1 14 0c0 5.65-7 10-7 10Z" /><circle cx="12" cy="11" r="2.5" /></svg>
          <span className="truncate">Mendaftar untuk demo: {context}</span>
        </span>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
        {choice("daftar", "Daftar komunitas baru", "Isi data komunitas → password login dikirim via WhatsApp.",
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>)}
        {choice("login", "Sudah punya akun", "Login pakai password yang dikirim ke WhatsApp.",
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="m10 17 5-5-5-5" /><path d="M15 12H3" /></svg>)}
      </div>

      <div className="mt-6">{tab === "daftar" ? <RegisterForm /> : <LoginForm />}</div>
    </Sheet>
  );
}

// ─────────────── Ajukan Demo (brand + kategori dari katalog shop) ───────────────
const EVT_REQ = "komunitas:ajukan";

export function AjukanTrigger({ className, children }: { className?: string; children: React.ReactNode }) {
  if (!AJUKAN_DEMO_ON) return null;
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(EVT_REQ))}>
      {children}
    </button>
  );
}

function RequestForm({ options, community }: { options: Record<string, string[]>; community?: { name: string; waPhone: string } | null }) {
  const [state, action] = useFormState(requestDemo, {});
  const brands = Object.keys(options);
  const [brand, setBrand] = useState("");
  const kats = brand ? options[brand] ?? [] : [];
  if (state.ok) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-base font-[600] text-emerald-800">Pengajuan demo terkirim! 🎾</p>
        <p className="mt-1 text-sm text-emerald-700">Tim Tirtonic akan menghubungi WhatsApp PIC untuk atur jadwal demo.</p>
      </div>
    );
  }
  const select = `${field} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23525252' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_1rem_center] bg-no-repeat pr-10`;
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className={label}>Nama Komunitas Tenis</label>
        <input name="name" required defaultValue={community?.name} className={field} placeholder="Cth: Semarang Tennis Club" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Kota</label>
          <select name="city" required defaultValue="" className={select}>
            <option value="" disabled>Pilih kota</option>
            {["Jogja", "Solo", "Semarang"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>No. WhatsApp PIC / Kapten</label>
          <input name="waPhone" required inputMode="numeric" defaultValue={community?.waPhone ? "0" + community.waPhone.replace(/^62/, "") : undefined} className={field} placeholder="0812-xxxx-xxxx" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Brand</label>
          <select name="brand" required value={brand} onChange={(e) => setBrand(e.target.value)} className={select}>
            <option value="" disabled>Pilih brand</option>
            {brands.map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Kategori produk</label>
          <select key={brand} name="kategori" required defaultValue="" disabled={!brand} className={`${select} disabled:opacity-50`}>
            <option value="" disabled>{brand ? "Pilih kategori" : "Pilih brand dulu"}</option>
            {kats.map((k) => <option key={k}>{k}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={label}>Catatan <span className="font-[400] text-neutral-400">(opsional)</span></label>
        <textarea name="note" rows={2} maxLength={500} className={`${field} resize-none`} placeholder="Cth: seri Ezone / Percept, ±20 pemain, mabar tiap Sabtu sore" />
      </div>
      {state.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <Submit label="Kirim Pengajuan Demo" busy="Mengirim…" />
    </form>
  );
}

/** Popup "Ajukan Demo": komunitas pilih brand & kategori (dari katalog shop). Pasang sekali per halaman. */
export function AjukanSheet({ options, community }: { options: Record<string, string[]>; community?: { name: string; waPhone: string } | null }) {
  const [open, setOpen] = useState(false);
  const [n, setN] = useState(0); // reset form tiap dibuka
  useEffect(() => {
    const on = () => { setN((x) => x + 1); setOpen(true); };
    window.addEventListener(EVT_REQ, on);
    return () => window.removeEventListener(EVT_REQ, on);
  }, []);
  return (
    <Sheet open={open} onClose={() => setOpen(false)} label="Ajukan demo">
      <span className="inline-flex items-center gap-2 rounded-full border border-lime-200 bg-lime-50 px-3.5 py-1 text-xs font-[600] text-lime-800">
        <span className="h-2 w-2 rounded-full bg-lime-500" /> Formulir pengajuan demo
      </span>
      <h2 className="mt-4 text-3xl font-[600] tracking-tight text-neutral-950 sm:text-4xl">Ajukan Demo Day</h2>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600 sm:text-base">Pilih brand & kategori produk yang ingin dicoba komunitasmu. Tim Tirtonic akan atur jadwal & lapangannya.</p>
      <div className="mt-6"><RequestForm key={n} options={options} community={community} /></div>
    </Sheet>
  );
}
