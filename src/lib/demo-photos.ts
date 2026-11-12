import "server-only";

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
