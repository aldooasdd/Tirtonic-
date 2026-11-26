"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { can, isAuthed } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isKat } from "@/lib/compare-shared";

function cek() {
  if (!isAuthed() || !can("produk")) throw new Error("Tidak diizinkan");
}
const segar = () => { revalidateTag("bandingkan"); revalidatePath("/dashboard/bandingkan"); };

export async function tambahPick(fd: FormData) {
  cek();
  const kategori = String(fd.get("kategori"));
  const judul = String(fd.get("judul") || "").trim();
  const itemIds = [...new Set(fd.getAll("item").map(String).filter(Boolean))].slice(0, 4);
  if (!isKat(kategori) || !judul || itemIds.length < 2) throw new Error("Isi judul dan pilih minimal 2 barang");
  const urutan = await prisma.comparePick.count({ where: { kategori } });
  await prisma.comparePick.create({ data: { kategori, judul, itemIds, urutan } });
  segar();
}

export async function hapusPick(id: string) {
  cek();
  await prisma.comparePick.delete({ where: { id } });
  segar();
}
