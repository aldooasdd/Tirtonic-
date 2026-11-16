import "server-only";
import { prisma } from "@/lib/prisma";
import { sendWa } from "@/lib/wa";

// Foto kegiatan demo disimpan di PC server (Tirtonichub /api/demo-photos), bukan di DB/storage tirtonic.com.
// Base URL = origin dari TIRTONICHUB_POINTS_URL; auth header x-points-secret (POINTS_API_SECRET).
function hub() {
  const raw = process.env.TIRTONICHUB_POINTS_URL;
  const secret = process.env.POINTS_API_SECRET;
  if (!raw || !secret) return null;
  return { url: `${new URL(raw).origin}/api/demo-photos`, headers: { "x-points-secret": secret } };
}

/** { claimId: url[] }, atau null kalau hub tidak bisa dihubungi. */
export async function hubDemoPhotos(claimIds: string[]): Promise<Record<string, string[]> | null> {
  const h = hub();
  if (!h || !claimIds.length) return h ? {} : null;
  try {
    const r = await fetch(`${h.url}?claimIds=${encodeURIComponent(claimIds.join(","))}`, { headers: h.headers, cache: "no-store", signal: AbortSignal.timeout(8000) });
    return r.ok ? ((await r.json()) as Record<string, string[]>) : null;
  } catch {
    return null;
  }
}

export async function uploadHubDemoPhoto(claimId: string, jpeg: Buffer, meta: { community: string; title: string }): Promise<{ ok: boolean; message?: string }> {
  const h = hub();
  if (!h) return { ok: false, message: "Server foto belum dikonfigurasi." };
  const fd = new FormData();
  fd.set("claimId", claimId);
  fd.set("community", meta.community);
  fd.set("title", meta.title);
  fd.set("file", new Blob([new Uint8Array(jpeg)], { type: "image/jpeg" }), "kegiatan.jpg");
  try {
    const r = await fetch(h.url, { method: "POST", headers: h.headers, body: fd, signal: AbortSignal.timeout(30000) });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    return r.ok && j.ok ? { ok: true } : { ok: false, message: j.message || "Server foto sedang tidak bisa dihubungi." };
  } catch {
    return { ok: false, message: "Server foto sedang tidak bisa dihubungi. Coba lagi sebentar." };
  }
}

/** Demo yang produknya sudah dikembalikan tapi belum ada foto kegiatan.
 *  ponytail: hub mati → tidak memblokir (fail-open), supaya komunitas tak terkunci karena PC mati. */
export async function claimsOwingPhoto<T extends { id: string; returnedAt: Date | null }>(claims: T[]): Promise<T[]> {
  const returned = claims.filter((c) => c.returnedAt);
  if (!returned.length) return [];
  const photos = await hubDemoPhotos(returned.map((c) => c.id));
  if (!photos) return [];
  return returned.filter((c) => !photos[c.id]?.length);
}

/** Foto dokumentasi sudah diupload → tiap peserta ACC dapat voucher Rp50rb khusus produk demo + WA. Idempoten per peserta (kode unik). */
export async function releaseDemoVouchers(claimId: string) {
  const claim = await prisma.demoClaim.findUnique({
    where: { id: claimId },
    include: { campaign: { select: { brand: true, productType: true } }, participants: { where: { status: "accepted" } } },
  });
  if (!claim?.returnedAt) return;
  const produk = `${claim.campaign.brand} ${claim.campaign.productType}`;
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://tirtonic.com").replace(/\/$/, "");
  for (const p of claim.participants) {
    const code = `DEMO-${p.id.slice(-6).toUpperCase()}`;
    if (await prisma.memberVoucher.findFirst({ where: { code, source: "demo" }, select: { id: true } })) continue; // sudah dapat
    await prisma.memberVoucher.create({
      data: { phone: p.phone, code, label: `Potongan Rp 50.000 khusus ${produk}`, type: "amount", value: 50_000, source: "demo" },
    });
    await sendWa(
      p.phone,
      `🎉 Selamat ${p.name}, kamu mendapat voucher!\n\nTerima kasih sudah ikut demo ${produk} bareng Tirtonic. Ini hadiah untukmu:\n\n🎁 *Potongan Rp 50.000* khusus ${produk}\nKode: *${code}*\n\nTunjukkan kode ini ke kasir Tirtonic saat beli. Voucher & dashboard kamu:\n${site}/riwayat/${p.phone}/voucher`,
    );
  }
}
