import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed, can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyRedeemToken } from "@/lib/pickup-token";
import { fetchAcePoints } from "@/lib/tirtonichub-points";
import { confirmRedemption } from "@/app/riwayat/tukar-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Potong Poin — Tirtonic Admin", robots: { index: false } };

const rupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");
const fmt = (d: Date) => new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function RedeemScanPage({ params }: { params: { token: string } }) {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("stringing")) redirect("/dashboard");

  const id = verifyRedeemToken(params.token);
  const red = id ? await prisma.pointRedemption.findUnique({ where: { id } }) : null;
  const ace = red ? await fetchAcePoints(red.phone) : null;
  const enough = red && ace ? red.points <= ace.balance : false;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-5">
      <div className="w-full max-w-sm rounded-2xl border bg-white p-6 text-center shadow-sm">
        {!red ? (
          <>
            <p className="text-lg font-bold text-red-600">QR tidak valid</p>
            <p className="mt-1 text-sm text-gray-500">Token tidak dikenali.</p>
          </>
        ) : red.status === "used" ? (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <p className="mt-3 text-lg font-bold text-gray-900">Poin sudah dipotong</p>
            <p className="mt-1 text-sm text-gray-500">{red.points} PTS · {rupiah(red.rupiah)}</p>
            <p className="mt-0.5 text-xs text-gray-400">{red.usedAt ? `Dipakai ${fmt(red.usedAt)}` : ""}{red.usedBy ? ` oleh ${red.usedBy}` : ""}</p>
          </>
        ) : (
          <>
            <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase text-primary">Potongan {red.kind === "stringing" ? "Jasa Stringing" : "Kasir"}</span>
            <h1 className="mt-2 text-3xl font-extrabold text-gray-900">{rupiah(red.rupiah)}</h1>
            <p className="mt-0.5 text-sm text-gray-500">{red.points} PTS · {red.phone}</p>
            {red.note && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{red.note}</p>}
            <p className="mt-3 text-xs text-gray-500">Saldo poin pelanggan: <strong>{ace?.balance ?? 0} PTS</strong></p>
            {enough ? (
              <form action={confirmRedemption.bind(null, params.token)} className="mt-4">
                <button className="w-full rounded-full bg-primary py-3 font-bold text-white hover:bg-primaryDark">Konfirmasi potongan {rupiah(red.rupiah)}</button>
              </form>
            ) : (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">Poin pelanggan tidak cukup — penukaran tidak bisa dikonfirmasi.</p>
            )}
            <p className="mt-2 text-[11px] text-gray-400">Potong maksimal 30% dari total belanja.</p>
          </>
        )}
        <Link href="/dashboard/stringing" className="mt-4 inline-block text-xs font-medium text-gray-400 hover:text-primary">← Kembali</Link>
      </div>
    </div>
  );
}
