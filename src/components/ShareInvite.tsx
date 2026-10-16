"use client";

import { useState } from "react";

// Bagikan undangan IG Story. Web Share API beda-beda per HP, jadi selalu ada
// fallback: buka/unduh gambar → user simpan → post ke Story manual.
// Swipe-up/link sticker otomatis BUTUH app native (Instagram Sticker API) — dari
// web nggak bisa. Jadi link acara disalin ke clipboard: user tambah stiker "Link"
// di Story lalu paste (2 tap).
export default function ShareInvite({ inviteUrl, eventPath, title }: { inviteUrl: string; eventPath: string; title: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  async function share() {
    setBusy(true); setErr(false); setMsg("Menyiapkan undangan…");
    const eventUrl = new URL(eventPath, window.location.origin).href;

    // Salin link DULU (masih dalam user gesture) biar clipboard jalan di Safari.
    try { await navigator.clipboard.writeText(eventUrl); setLinkCopied(true); } catch { setLinkCopied(false); }

    try {
      const res = await fetch(inviteUrl);
      if (!res.ok) throw new Error("fetch gagal");
      const blob = await res.blob();
      const file = new File([blob], "undangan-tirtonic.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      const tip = linkCopied ? " Link acara sudah disalin — di Story, tambah stiker “Link” lalu paste biar bisa diklik." : "";

      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: `Undangan Demo — ${title}`, text: eventUrl });
          setMsg(linkCopied ? "Di Instagram Story, tambah stiker “Link” lalu paste (link sudah disalin)." : "");
          return;
        } catch (e) {
          if ((e as Error).name === "AbortError") { setMsg(""); return; }
        }
      }

      // Fallback: buka gambar (bisa ditahan → Simpan) atau unduh.
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");
      if (!win) {
        const a = document.createElement("a");
        a.href = url; a.download = "undangan-tirtonic.png"; a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMsg("Tahan gambar → Simpan, lalu posting ke Instagram Story." + tip);
    } catch {
      setErr(true);
      setMsg("Gagal menyiapkan undangan. Cek koneksi, lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={share}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] px-3.5 py-1.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
          {busy ? "Menyiapkan…" : "Bagikan undangan ke Story"}
        </button>
        <a href={inviteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
          Simpan gambar
        </a>
      </div>
      {msg && <p className={`mt-1 text-xs ${err ? "text-red-600" : "text-gray-500"}`}>{msg}</p>}
    </div>
  );
}
