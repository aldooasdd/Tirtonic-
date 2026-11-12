"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/string-finder/phone";
import { phaseOf } from "@/lib/event-phase";
import { sendWa } from "@/lib/wa";
import { currentCommunityId } from "@/lib/community-auth";
import { DEMO_REQUEST_OPTIONS } from "@/lib/demo-products";

export type JoinState = { error?: string; ok?: boolean };

/** Orang umum join acara demo "open" dari web. Perlu di-ACC komunitas penyelenggara. */
export async function joinEvent(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const claimId = ((formData.get("claimId") as string) || "").trim();
  const name = ((formData.get("name") as string) || "").trim();
  const phone = normalizePhone((formData.get("phone") as string) || "");
  if (!name) return { error: "Nama wajib diisi." };
  if (!phone) return { error: "Nomor WhatsApp tidak valid (contoh: 0812xxxx)." };

  const claim = await prisma.demoClaim.findUnique({
    where: { id: claimId },
    include: {
      community: { select: { name: true, waPhone: true } },
      campaign: { select: { brand: true } },
      participants: { select: { status: true, phone: true } },
    },
  });
  if (!claim) return { error: "Acara tidak ditemukan." };
  if (claim.quotaType !== "open") return { error: "Acara ini kuotanya tertutup, tidak menerima pendaftaran online." };
  const phase = phaseOf(claim);
  if (phase !== "coming_soon" && phase !== "ongoing") return { error: "Pendaftaran acara ini sudah ditutup." };
  if (claim.participants.some((p) => p.phone === phone && p.status !== "rejected")) return { error: "Nomor ini sudah terdaftar di acara ini." };
  const accepted = claim.participants.filter((p) => p.status === "accepted").length;
  if (accepted >= claim.quota) return { error: "Kuota peserta sudah penuh." };

  await prisma.demoParticipant.create({ data: { claimId, name, phone, status: "pending" } });
  await sendWa(
    claim.community.waPhone,
    `🔔 Ada peserta baru mau join demo ${claim.campaign.brand}!\n\nNama: ${name}\nWA: ${phone}\nSesi: ${claim.demoDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} ${claim.time}${claim.timeEnd ? `–${claim.timeEnd}` : ""}\n\nTerima/tolak di dashboard komunitas: tirtonic.com/komunitas`,
  );
  revalidatePath(`/event/${claimId}`);
  revalidatePath("/komunitas");
  return { ok: true };
}

export type RequestState = { error?: string; ok?: boolean };
const CITIES = ["Jogja", "Solo", "Semarang"];

/** Komunitas mengajukan demo brand + kategori (pilihan dari katalog shop). Admin lihat di /dashboard/event. */
export async function requestDemo(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const get = (k: string) => ((formData.get(k) as string) || "").trim();
  const name = get("name").slice(0, 80);
  const waPhone = normalizePhone(get("waPhone"));
  const city = get("city");
  const brand = get("brand");
  const kategori = get("kategori");
  const note = get("note").slice(0, 500);
  if (!name) return { error: "Nama komunitas wajib diisi." };
  if (!waPhone) return { error: "Nomor WhatsApp tidak valid (contoh: 0812xxxx)." };
  if (!CITIES.includes(city)) return { error: "Pilih kota." };
  if (!brand || !kategori) return { error: "Pilih brand & kategori produk." };
  if (!DEMO_REQUEST_OPTIONS[brand]?.includes(kategori)) return { error: "Brand / kategori tidak tersedia untuk demo." };

  const communityId = currentCommunityId();
  await prisma.demoRequest.create({ data: { communityId, name, waPhone, city, brand, kategori, note } });
  revalidatePath("/dashboard/event");
  await sendWa(
    waPhone,
    `🎾 *Pengajuan demo diterima!*\n\nKomunitas: ${name}\nKota: ${city}\nProduk: ${brand} — ${kategori}${note ? `\nCatatan: ${note}` : ""}\n\nTim Tirtonic akan menghubungi kamu untuk atur jadwal demo. 🙏`,
  );
  return { ok: true };
}
