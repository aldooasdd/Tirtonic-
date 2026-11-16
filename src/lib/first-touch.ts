import "server-only";
import { cookies } from "next/headers";

// Asal kunjungan pertama dari cookie tt_first (diset components/FirstTouch).
export function readFirstTouch(): { page: string | null; source: string | null } {
  try {
    const raw = cookies().get("tt_first")?.value;
    if (!raw) return { page: null, source: null };
    const j = JSON.parse(decodeURIComponent(raw)) as { p?: string; s?: string; r?: string };
    return { page: j.p || null, source: sourceLabel(j.s, j.r) };
  } catch {
    return { page: null, source: null };
  }
}

/** ?src=/utm_source menang; selain itu tebak dari domain referrer. */
export function sourceLabel(tag?: string, ref?: string): string {
  const t = (tag || "").toLowerCase();
  if (t) {
    if (/^(ig|insta)/.test(t)) return "Instagram";
    if (/^(wa|whatsapp)/.test(t)) return "WhatsApp";
    if (/^(fb|facebook)/.test(t)) return "Facebook";
    if (/^(tt|tiktok)/.test(t)) return "TikTok";
    if (/^qr/.test(t)) return "QR";
    if (/^google/.test(t)) return "Google";
    return tag!;
  }
  const r = (ref || "").toLowerCase();
  if (!r) return "Langsung";
  if (r.includes("instagram")) return "Instagram";
  if (r.includes("google")) return "Google";
  if (r.includes("facebook") || r === "fb.me" || r.startsWith("l.facebook") || r.startsWith("m.facebook")) return "Facebook";
  if (r.includes("whatsapp") || r === "wa.me") return "WhatsApp";
  if (r.includes("tiktok")) return "TikTok";
  if (r.includes("bing") || r.includes("yahoo") || r.includes("duckduckgo")) return "Search";
  if (r.includes("tokopedia") || r.includes("shopee")) return "Marketplace";
  return r.replace(/^www\./, "");
}
