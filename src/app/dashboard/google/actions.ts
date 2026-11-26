"use server";
import { revalidatePath } from "next/cache";
import { can, isAuthed } from "@/lib/auth";
import { syncMerchant } from "@/lib/google-merchant";

export async function sinkronGoogle() {
  if (!isAuthed() || !can("produk")) throw new Error("Tidak diizinkan");
  const r = await syncMerchant();
  revalidatePath("/dashboard/google");
  return { ...r, gagal: r.gagal.slice(0, 30) };
}
