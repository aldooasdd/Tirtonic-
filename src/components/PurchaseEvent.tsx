"use client";

import { useEffect } from "react";
import { trackEcom, type GaItem } from "@/lib/gtag";

/** Event purchase GA4: sekali per invoice (localStorage), hanya untuk pesanan yang lunas ≤ 3 hari lalu. */
export default function PurchaseEvent({ invoice, total, shipping, coupon, items, paidAt }: { invoice: string; total: number; shipping: number; coupon?: string | null; items: GaItem[]; paidAt: string | null }) {
  useEffect(() => {
    if (!paidAt || Date.now() - new Date(paidAt).getTime() > 3 * 86_400_000) return;
    const key = `ga_purchase_${invoice}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {}
    trackEcom("purchase", items, { transaction_id: invoice, value: total, shipping, ...(coupon ? { coupon } : {}) });
  }, [invoice, total, shipping, coupon, items, paidAt]);
  return null;
}
