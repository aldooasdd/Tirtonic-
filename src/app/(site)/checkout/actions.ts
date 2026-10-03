"use server";

import { createOrder, shippingOptions, type CheckoutInput, type CreateOrderResult, type CartLine } from "@/lib/orders";
import type { RateOption } from "@/lib/biteship";

export async function submitCheckout(input: CheckoutInput): Promise<CreateOrderResult> {
  return createOrder(input);
}

export async function checkRates(kodePos: string, items: CartLine[]): Promise<RateOption[]> {
  return shippingOptions(kodePos, items);
}
