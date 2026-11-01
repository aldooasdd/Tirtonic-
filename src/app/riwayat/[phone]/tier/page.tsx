import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import { normalizePhone } from "@/lib/string-finder/phone";
import { fetchAcePoints } from "@/lib/tirtonichub-points";
import StringingBottomNav from "@/components/StringingBottomNav";
import TierBenefits from "@/components/TierBenefits";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manfaat Tier — Tirtonic", robots: { index: false } };

export default async function TierPage({ params }: { params: { phone: string } }) {
  const phone = normalizePhone(decodeURIComponent(params.phone));
  const pts = await fetchAcePoints(phone);
  const member = phone
    ? await safeQuery(() => prisma.member.findUnique({ where: { phone }, select: { coachCode: true } }), null)
    : null;

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[#fbf8ff] pb-28 font-sans text-slate-800 antialiased">
      <header className="relative z-10 px-5 pb-1 pt-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase leading-none tracking-wider text-slate-400">Tirtonic Ace</span>
            <h1 className="text-2xl font-extrabold tracking-tight text-emerald-900">Manfaat Tier</h1>
          </div>
          <Link href={`/riwayat/${encodeURIComponent(phone ?? "")}`} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">← Dashboard</Link>
        </div>
        <p className="text-xs text-slate-500">Lihat keuntungan tiap tingkatan kartu &amp; progres kualifikasimu.</p>
      </header>

      <main className="relative z-10 px-5 pt-4">
        <TierBenefits tier={pts.tier} spend12mo={pts.spend12mo} balance={pts.balance} isCoach={pts.isCoach} coachCode={member?.coachCode ?? null} />
      </main>

      <StringingBottomNav active="home" phone={phone} />
    </div>
  );
}
