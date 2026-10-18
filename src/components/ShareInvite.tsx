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

  async function share() {
    setBusy(true); setErr(false); setMsg("Menyiapkan undangan…");
    const eventUrl = new URL(eventPath, window.location.origin).href;

    // Salin link DULU (masih dalam user gesture) biar clipboard jalan di Safari.
    let linkCopied = false;
    try { await navigator.clipboard.writeText(eventUrl); linkCopied = true; } catch {}

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

  // WA: kirim teks + link acara (preview gambar ikut dari OG halaman event).
  function shareWa() {
    const eventUrl = new URL(eventPath, window.location.origin).href;
    window.open(`https://wa.me/?text=${encodeURIComponent(`Yuk ikut demo ${title} bareng Tirtonic! 🎾\n${eventUrl}`)}`, "_blank");
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500">Bagikan:</span>
        <button
          type="button"
          onClick={share}
          disabled={busy}
          aria-label="Bagikan undangan ke Instagram Story"
          title="Bagikan ke Instagram Story"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-[#fcb045] via-[#fd1d1d] to-[#833ab4] text-white transition hover:opacity-90 disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
        </button>
        <button
          type="button"
          onClick={shareWa}
          aria-label="Bagikan undangan ke WhatsApp"
          title="Bagikan ke WhatsApp"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white transition hover:opacity-90"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43a9.38 9.38 0 0 1 9.43 9.44c0 5.2-4.24 9.42-9.44 9.42zm8.02-17.45A11.27 11.27 0 0 0 12.05.75C5.8.75.72 5.83.72 12.07c0 2 .52 3.95 1.51 5.66L.62 23.25l5.65-1.48a11.3 11.3 0 0 0 5.78 1.47h.01c6.24 0 11.32-5.08 11.33-11.32a11.26 11.26 0 0 0-3.32-8.01z" /></svg>
        </button>
      </div>
      {msg && <p className={`mt-1 text-xs ${err ? "text-red-600" : "text-gray-500"}`}>{msg}</p>}
    </div>
  );
}
