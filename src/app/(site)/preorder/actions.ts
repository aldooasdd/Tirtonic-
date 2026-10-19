"use server";

import { createPreorder, type PreorderInput, type CreatePreorderResult } from "@/lib/preorder";

export async function submitPreorder(input: PreorderInput): Promise<CreatePreorderResult> {
  return createPreorder(input);
}
