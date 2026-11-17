"use server";

import { createOrder, resolveLines, shippingOptions, couponLines, type CartLine, type CheckoutInput, type CreateOrderResult } from "@/lib/orders";
import { computeCoupon, computeMemberVoucher, type CouponResult, type VoucherResult } from "@/lib/coupons";
import { searchLocations, type LocationOption, type RateOption } from "@/lib/ongkir";

export async function submitCheckout(input: CheckoutInput): Promise<CreateOrderResult> {
  return createOrder(input);
}

// Preview potongan kupon sebelum pesanan dibuat. Harga & kelayakan dihitung dari
// DB (bukan dari client), jadi sama persis dengan yang dipakai createOrder.
export async function applyCoupon(input: { code: string; items: CartLine[] }): Promise<CouponResult> {
  const resolved = await resolveLines(input.items);
  if (!resolved.ok) return { ok: false, error: resolved.error };
  const cl = couponLines(resolved.lines); // B1G1 tidak bisa digabung kupon
  if (!cl.length) return { ok: false, error: "Kupon tidak berlaku untuk barang Buy 1 Get 1." };
  return computeCoupon(input.code, cl);
}

// Daftar ongkir ke kode pos tujuan (harga & berat dari DB).
export async function findLocations(q: string): Promise<LocationOption[]> {
  return searchLocations(q.slice(0, 60));
}

/** dest: id lokasi Binderbyte (hasil findLocations) atau kode pos. */
export async function checkRates(kodePos: string, items: CartLine[]): Promise<RateOption[]> {
  const resolved = await resolveLines(items);
  if (!resolved.ok) return [];
  return shippingOptions(kodePos, resolved.lines);
}

// Voucher demo milik nomor HP (otomatis, tanpa kode).
export async function checkMemberVoucher(input: { phone: string; items: CartLine[] }): Promise<VoucherResult> {
  const resolved = await resolveLines(input.items);
  if (!resolved.ok) return null;
  return computeMemberVoucher(input.phone, couponLines(resolved.lines));
}
