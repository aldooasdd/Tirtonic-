import { prisma, safeQuery } from "@/lib/prisma";
import { trackResi, courierTrackUrl } from "@/lib/tracking";

export const dynamic = "force-dynamic";

// Lacak resi sebuah pesanan. Dipanggil dari dashboard customer saat tombol
// "Lacak" diklik (bukan tiap buka halaman → hemat kredit Binderbyte).
// Pakai orderId (bukan resi bebas) biar API berbayar tak bisa dipakai lacak
// resi sembarangan oleh orang luar.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("orderId") || "";
  if (!id) return Response.json({ error: "no_order" }, { status: 400 });

  const order = await safeQuery(
    () => prisma.order.findUnique({ where: { id }, select: { kurir: true, resi: true, status: true } }),
    null
  );
  if (!order || !order.resi || (order.status !== "SHIPPED" && order.status !== "DELIVERED")) {
    return Response.json({ error: "not_trackable" }, { status: 404 });
  }

  const result = await trackResi(order.kurir, order.resi);
  if (!result) {
    // Tak terlacak via API (Paxel / belum set key / gagal) → kasih link situs kurir.
    return Response.json({ history: [], fallbackUrl: courierTrackUrl(order.kurir, order.resi), resi: order.resi, kurir: order.kurir });
  }
  return Response.json({ history: result.history, status: result.status, resi: order.resi, kurir: order.kurir });
}
