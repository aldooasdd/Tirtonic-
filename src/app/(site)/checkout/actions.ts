"use server";

import { createOrder, resolveLines, type CartLine, type CheckoutInput, type CreateOrderResult } from "@/lib/orders";
import { computeCoupon, type CouponResult } from "@/lib/coupons";

export async function submitCheckout(input: CheckoutInput): Promise<CreateOrderResult> {
  return createOrder(input);
}

// Preview potongan kupon sebelum pesanan dibuat. Harga & kelayakan dihitung dari
// DB (bukan dari client), jadi sama persis dengan yang dipakai createOrder.
export async function applyCoupon(input: { code: string; items: CartLine[] }): Promise<CouponResult> {
  const resolved = await resolveLines(input.items);
  if (!resolved.ok) return { ok: false, error: resolved.error };
  return computeCoupon(input.code, resolved.lines.map((l) => ({ productId: l.productId, harga: l.harga, qty: l.qty, wasDiscounted: l.wasDiscounted })));
}
