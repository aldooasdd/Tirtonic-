"use client";

import { useState } from "react";

// Bagikan undangan IG Story: fetch gambar → share sheet HP (pilih Instagram → Stories).
// Spotify-style auto-sticker butuh app native; dari web ini yang paling mendekati.
export default function ShareInvite({ inviteUrl, title }: { inviteUrl: string; title: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState(false);

  async function share() {
    setBusy(true); setErr(false); setMsg("Menyiapkan undangan…");
    try {
      const res = await fetch(inviteUrl);
      if (!res.ok) throw new Error("gagal");
      const blob = await res.blob();
      const file = new File([blob], "undangan-tirtonic.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: `Undangan Demo — ${title}` });
        setMsg("");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "undangan-tirtonic.png"; a.click();
        URL.revokeObjectURL(url);
        setMsg("Gambar diunduh. Upload ke Instagram Story kamu ya.");
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") { setMsg(""); }
      else { setErr(true); setMsg("Gagal menyiapkan undangan. Coba lagi."); }
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
        <a href={inviteUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-gray-400 hover:text-primary">Lihat ↗</a>
      </div>
      {msg && <p className={`mt-1 text-xs ${err ? "text-red-600" : "text-gray-400"}`}>{msg}</p>}
    </div>
  );
}
