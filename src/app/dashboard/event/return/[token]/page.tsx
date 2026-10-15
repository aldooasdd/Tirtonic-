import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed, can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyReturnToken } from "@/lib/pickup-token";
import { markReturned } from "../../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pengembalian Produk — Tirtonic Admin", robots: { index: false } };

export default async function ReturnPage({ params }: { params: { token: string } }) {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("event")) redirect("/dashboard");

  const claimId = verifyReturnToken(params.token);
  const claim = claimId
    ? await prisma.demoClaim.findUnique({
        where: { id: claimId },
        include: { campaign: { select: { brand: true, title: true } }, community: { select: { name: true } } },
      })
    : null;

  const fmt = (d: Date) => new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-5">
      <div className="w-full max-w-sm rounded-2xl border bg-white p-6 text-center shadow-sm">
        {!claim ? (
          <>
            <p className="text-lg font-bold text-red-600">QR tidak valid</p>
            <p className="mt-1 text-sm text-gray-500">Token tidak dikenali atau acara sudah dihapus.</p>
          </>
        ) : claim.returnedAt ? (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <p className="mt-3 text-lg font-bold text-gray-900">Produk sudah dikembalikan</p>
            <p className="mt-1 text-sm text-gray-500">{claim.community.name} · {claim.campaign.brand}</p>
            <p className="mt-0.5 text-xs text-gray-400">Dikembalikan {fmt(claim.returnedAt)}</p>
          </>
        ) : (
          <>
            <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase text-primary">{claim.campaign.brand}</span>
            <h1 className="mt-2 text-lg font-bold text-gray-900">{claim.campaign.title}</h1>
            <p className="mt-0.5 text-sm text-gray-500">Komunitas: {claim.community.name}</p>
            {!claim.pickedUpAt && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">Catatan: produk ini belum tercatat diambil.</p>}
            <form action={markReturned.bind(null, params.token)} className="mt-5">
              <button className="w-full rounded-full bg-primary py-3 font-bold text-white hover:bg-primaryDark">Tandai produk dikembalikan</button>
            </form>
          </>
        )}
        <Link href="/dashboard/event" className="mt-4 inline-block text-xs font-medium text-gray-400 hover:text-primary">← Dashboard event</Link>
      </div>
    </div>
  );
}
