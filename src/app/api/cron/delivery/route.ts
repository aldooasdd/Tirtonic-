import { autoDeliverShipped } from "@/lib/orders";

export const dynamic = "force-dynamic";

// Cron harian: order SHIPPED yang resinya sudah "delivered" → auto DELIVERED.
// Diamankan pakai CRON_SECRET (Vercel kirim "Authorization: Bearer <CRON_SECRET>").
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const delivered = await autoDeliverShipped();
  return Response.json({ ok: true, delivered });
}
