import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed, can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyRewardToken } from "@/lib/pickup-token";
import { redeemReward } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tukar Hadiah — Tirtonic Admin", robots: { index: false } };

const fmt = (d: Date) => new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function RewardRedeemPage({ params }: { params: { token: string } }) {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("stringing")) redirect("/dashboard");

  const id = verifyRewardToken(params.token);
  const reward = id ? await prisma.reward.findUnique({ where: { id } }) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-5">
      <div className="w-full max-w-sm rounded-2xl border bg-white p-6 text-center shadow-sm">
        {!reward ? (
          <>
            <p className="text-lg font-bold text-red-600">QR tidak valid</p>
            <p className="mt-1 text-sm text-gray-500">Token tidak dikenali atau hadiah sudah dihapus.</p>
          </>
        ) : reward.redeemedAt ? (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <p className="mt-3 text-lg font-bold text-gray-900">Hadiah sudah ditukar</p>
            <p className="mt-1 text-sm text-gray-500">{reward.name ?? reward.phone} · Peringkat {reward.rank}</p>
            <p className="mt-0.5 text-xs text-gray-400">Ditukar {fmt(reward.redeemedAt)}{reward.redeemedBy ? ` oleh ${reward.redeemedBy}` : ""}</p>
          </>
        ) : (
          <>
            <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase text-primary">Peringkat {reward.rank} · {reward.period}</span>
            <h1 className="mt-2 text-lg font-bold text-gray-900">{reward.name ?? "Pemenang"}</h1>
            <p className="mt-0.5 text-sm text-gray-500">{reward.phone}</p>
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{reward.prize}</p>
            <form action={redeemReward.bind(null, params.token)} className="mt-5">
              <button className="w-full rounded-full bg-primary py-3 font-bold text-white hover:bg-primaryDark">Tandai hadiah ditukar</button>
            </form>
          </>
        )}
        <Link href="/dashboard/stringing/reward" className="mt-4 inline-block text-xs font-medium text-gray-400 hover:text-primary">← Scan hadiah lain</Link>
      </div>
    </div>
  );
}
