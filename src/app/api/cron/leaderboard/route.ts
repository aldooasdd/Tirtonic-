import { runLeaderboardReward } from "@/lib/reward";

export const dynamic = "force-dynamic";

// Cron Vercel (awal tiap bulan): tutup periode leaderboard bulan lalu → buat hadiah
// top 3 Global + kirim WA klaim. Diamankan pakai CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const res = await runLeaderboardReward();
  return Response.json({ ok: true, ...res });
}
