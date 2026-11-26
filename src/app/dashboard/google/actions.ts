"use server";
import { revalidatePath } from "next/cache";
import { can, isAuthed } from "@/lib/auth";
import { syncMerchant } from "@/lib/google-merchant";

export async function sinkronGoogle() {
  if (!isAuthed() || !can("produk")) throw new Error("Tidak diizinkan");
  // error dikembalikan sbg data: di production pesan error server action disembunyikan Next.js
  const r = await syncMerchant().catch((e: Error) => ({ total: 0, kirim: 0, hapus: 0, gagal: [e.message] }));
  revalidatePath("/dashboard/google");
  return { ...r, gagal: r.gagal.slice(0, 30) };
}
