import { runPreorderCron } from "@/lib/preorder";

export const dynamic = "force-dynamic";

// Cron Vercel (tiap jam): pengingat pelunasan H-2 + auto-batal lewat batas.
// Diamankan pakai CRON_SECRET (Vercel kirim "Authorization: Bearer <CRON_SECRET>").
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const res = await runPreorderCron();
  return Response.json({ ok: true, ...res });
}
