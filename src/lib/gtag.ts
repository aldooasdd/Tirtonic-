// Google tag (GTM-NVHS5B2T, dipasang di src/components/GoogleTag.tsx) — kirim event e-commerce GA4 / Google Ads.
// Aman dipanggil di server/SSR atau saat tag belum termuat: event masuk dataLayer dan dikirim begitu tag siap.
export type GaItem = { item_id: string; item_name: string; item_brand?: string; item_category?: string; item_variant?: string; price: number; quantity: number };

type W = Window & { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void };

export function track(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const w = window as W;
  w.dataLayer = w.dataLayer || [];
  // gtag harus push objek `arguments` (bukan array) supaya dibaca Google tag
  // eslint-disable-next-line prefer-rest-params
  w.gtag = w.gtag || function () { w.dataLayer!.push(arguments); };
  w.gtag("event", event, params);
}

/** Event e-commerce standar: currency IDR, value = Σ harga × qty kalau tidak diberikan. */
export function trackEcom(event: string, items: GaItem[], extra: Record<string, unknown> = {}) {
  const value = items.reduce((t, i) => t + i.price * i.quantity, 0);
  track(event, { currency: "IDR", value, items, ...extra });
}
