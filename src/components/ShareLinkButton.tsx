"use client";

import { useState } from "react";

// Bagikan link halaman: share sheet bawaan HP (WA/IG/dll), fallback salin link di desktop.
export default function ShareLinkButton({ path, title, className }: { path: string; title: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = new URL(path, window.location.origin).href;
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch {} // batal share = bukan error
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <button type="button" onClick={share} className={className}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></svg>
      {copied ? "Link disalin" : "Bagikan"}
    </button>
  );
}
