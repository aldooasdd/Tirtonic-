import { syncMerchant, merchantReady } from "@/lib/google-merchant";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Cron harian: kirim semua produk ke Google Merchant Center. Diamankan CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!merchantReady()) return Response.json({ ok: false, error: "GOOGLE_MERCHANT_* belum diisi" });
  const r = await syncMerchant();
  return Response.json({ ok: true, ...r, gagal: r.gagal.slice(0, 20) });
}
