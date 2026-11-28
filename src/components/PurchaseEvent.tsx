"use client";

import { useEffect } from "react";
import { track, trackEcom, type GaItem } from "@/lib/gtag";

const ADS_PEMBELIAN = "AW-18598720902/kAglCPDIhcEdEIbrx6RF"; // konversi Google Ads "Pembelian Website"

/** Event purchase GA4: sekali per invoice (localStorage), hanya untuk pesanan yang lunas ≤ 3 hari lalu. */
export default function PurchaseEvent({ invoice, total, shipping, coupon, items, paidAt, newCustomer }: { invoice: string; total: number; shipping: number; coupon?: string | null; items: GaItem[]; paidAt: string | null; newCustomer: boolean }) {
  useEffect(() => {
    if (!paidAt || Date.now() - new Date(paidAt).getTime() > 3 * 86_400_000) return;
    const key = `ga_purchase_${invoice}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {}
    track("conversion", { send_to: ADS_PEMBELIAN, value: total, currency: "IDR", transaction_id: invoice, new_customer: newCustomer });
    trackEcom("purchase", items, { transaction_id: invoice, value: total, shipping, ...(coupon ? { coupon } : {}) });
  }, [invoice, total, shipping, coupon, items, paidAt, newCustomer]);
  return null;
}
