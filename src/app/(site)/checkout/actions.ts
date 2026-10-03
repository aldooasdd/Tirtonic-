"use server";

import { createOrder, type CheckoutInput, type CreateOrderResult } from "@/lib/orders";

export async function submitCheckout(input: CheckoutInput): Promise<CreateOrderResult> {
  return createOrder(input);
}
