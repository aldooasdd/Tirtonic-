import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import JoinForm from "./JoinForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gabung Murid Coach — Tirtonic", robots: { index: false } };

export default async function JoinPage({ searchParams }: { searchParams: { ref?: string } }) {
  const code = (searchParams.ref ?? "").trim().toUpperCase();
  const coach = code ? await safeQuery(() => prisma.member.findFirst({ where: { coachCode: code, isCoach: true }, select: { name: true } }), null) : null;
  return (
    <div className="mx-auto min-h-screen max-w-md bg-[#F8FAFC] px-5 pb-16 pt-12 font-sans text-slate-800 antialiased">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tirtonic Ace</span>
      <h1 className="text-2xl font-extrabold tracking-tight text-emerald-900">Gabung Murid Coach</h1>
      {coach ? (
        <>
          <div className="mt-5 rounded-3xl bg-[linear-gradient(135deg,#004328_0%,#005a36_45%,#006D40_100%)] p-5 text-white shadow-[0_24px_48px_-12px_rgba(13,92,58,0.4)]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/80">Diundang oleh</div>
            <div className="mt-1 text-xl font-bold">Coach {coach.name ?? code}</div>
            <div className="mt-1 font-mono text-xs text-emerald-100/80">Kode {code}</div>
          </div>
          <p className="mt-4 text-sm text-slate-600">Daftarkan nomor WhatsApp kamu. Belanja &amp; stringing tetap dapat Ace Points seperti biasa, dan coach kamu ikut dapat bonus poin.</p>
          <div className="mt-5"><JoinForm code={code} /></div>
        </>
      ) : (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          Kode coach tidak ditemukan. Minta link terbaru ke coach kamu.
          <Link href="/" className="mt-3 block font-semibold text-emerald-700">Ke tirtonic.com →</Link>
        </div>
      )}
    </div>
  );
}
