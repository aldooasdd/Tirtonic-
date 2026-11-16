"use client";

import { useEffect } from "react";

// Catat halaman PERTAMA pengunjung masuk web + asalnya (sekali, cookie 90 hari).
// Dibaca server saat checkout → disimpan di pesanan (lihat lib/first-touch.ts).
export default function FirstTouch() {
  useEffect(() => {
    try {
      if (document.cookie.includes("tt_first=")) return;
      const path = location.pathname;
      if (path.startsWith("/dashboard") || path.startsWith("/api")) return; // admin bukan pengunjung
      const q = new URLSearchParams(location.search);
      const tag = q.get("src") || q.get("utm_source") || "";
      let ref = "";
      try { ref = document.referrer ? new URL(document.referrer).hostname : ""; } catch {}
      if (ref === location.hostname) ref = "";
      const v = encodeURIComponent(JSON.stringify({ p: path.slice(0, 120), s: tag.slice(0, 40), r: ref.slice(0, 80) }));
      document.cookie = `tt_first=${v}; path=/; max-age=${90 * 24 * 3600}; samesite=lax`;
    } catch {}
  }, []);
  return null;
}
