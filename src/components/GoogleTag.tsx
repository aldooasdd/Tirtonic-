"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { track } from "@/lib/gtag";

// Google tag (GA4 + Google Ads) — sekali di root layout. Dashboard/stringer (internal) tidak dilacak.
// Perpindahan halaman tanpa reload dicatat GA4 lewat "page changes based on browser history events" (default aktif).
const ID = "GTM-NVHS5B2T";

export default function GoogleTag() {
  const path = usePathname() || "";
  const internal = /^\/(dashboard|stringer)/.test(path);

  // generate_lead: klik tombol / link WhatsApp di mana pun
  useEffect(() => {
    if (internal) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (a && /wa\.me|api\.whatsapp\.com|whatsapp:\/\//i.test(a.href)) track("generate_lead", { method: "WhatsApp", page_path: location.pathname });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [internal]);

  if (internal) return null;
  return (
    <>
      <Script id="gtag-src" async src={`https://www.googletagmanager.com/gtm.js?id=${ID}`} strategy="afterInteractive" />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());`}
      </Script>
    </>
  );
}
