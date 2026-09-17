"use server";

import { prisma } from "@/lib/prisma";
import { uploadFile, storageConfigured } from "@/lib/storage";
import { sendSponsorshipEmail } from "@/lib/email";

export type SponsorState = { ok: boolean; message: string };

export async function submitSponsorship(
  _prev: SponsorState,
  formData: FormData
): Promise<SponsorState> {
  const get = (k: string) => (formData.get(k) as string | null)?.trim() || "";
  const getAll = (k: string) => formData.getAll(k).map(String);

  const organisasi = get("organisasi");
  const penanggungJawab = get("penanggungJawab");
  const noWa = get("noWa");
  const email = get("email");

  if (!organisasi || !penanggungJawab || !noWa || !email) {
    return { ok: false, message: "Nama organisasi, penanggung jawab, No. WA, dan email wajib diisi." };
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { ok: false, message: "Format email tidak valid." };
  }

  let proposalFile: string | null = null;
  const file = formData.get("proposalFile");
  if (file instanceof File && file.size > 0) {
    if (!storageConfigured) {
      return { ok: false, message: "Upload file belum aktif (Supabase Storage belum dikonfigurasi)." };
    }
    if (file.size > 10 * 1024 * 1024) {
      return { ok: false, message: "Ukuran file maksimal 10MB." };
    }
    try {
      proposalFile = await uploadFile(file, "proposals");
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  }

  const data = {
    organisasi,
    penanggungJawab,
    noWa,
    email,
    namaEvent: get("namaEvent") || null,
    jenisEvent: getAll("jenisEvent"),
    tanggalEvent: get("tanggalEvent") || null,
    alamatEvent: get("alamatEvent") || null,
    kota: get("kota") || null,
    ringkasan: get("ringkasan") || null,
    proposalFile,
    bentuk: getAll("bentuk"),
    eksposur: get("eksposur") || null,
    catatan: get("catatan") || null,
  };

  try {
    await prisma.sponsorshipSubmission.create({ data });
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Gagal menyimpan. Coba lagi atau hubungi admin." };
  }

  // Email notification is best-effort: a failure here must not lose the saved submission.
  try {
    await sendSponsorshipEmail(data);
  } catch (e) {
    console.error("Sponsorship email failed:", e);
  }

  return { ok: true, message: "Terima kasih! Pengajuan sponsorship Anda sudah kami terima." };
}
