import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import { normalizePhone, displayPhone } from "@/lib/string-finder/phone";
import { salam } from "@/lib/wa";
import { fetchAcePoints } from "@/lib/tirtonichub-points";
import StringingBottomNav from "@/components/StringingBottomNav";
import TukarPoin from "@/components/TukarPoin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tukar Poin — Tirtonic", robots: { index: false } };

const rupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");
const fmt = (d: Date) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) + " • " + new Date(d).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";

export default async function TukarPage({ params }: { params: { phone: string } }) {
  const phone = normalizePhone(decodeURIComponent(params.phone));
  const pts = await fetchAcePoints(phone);
  const history = phone
    ? await safeQuery(() => prisma.pointRedemption.findMany({ where: { phone }, orderBy: { createdAt: "desc" }, take: 20 }), [])
    : [];

  const greeting = `Selamat ${salam()}`;

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[#F8FAFC] pb-28 font-sans text-slate-800 antialiased">
      <header className="relative z-10 px-5 pb-1 pt-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase leading-none tracking-wider text-slate-400">{greeting}</span>
            <h1 className="text-2xl font-extrabold tracking-tight text-emerald-900">Tukar Poin</h1>
          </div>
          <Link href={`/riwayat/${encodeURIComponent(phone ?? "")}`} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">← Dashboard</Link>
        </div>
        <p className="text-xs text-slate-500">Konversi Ace Points ke potongan belanja &amp; jasa. Kurs tetap 1 PTS = Rp 1.000.</p>
      </header>

      <main className="relative z-10 space-y-5 px-5 pt-4">
        {/* Saldo */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-600/30 p-5 text-white shadow-[0_24px_48px_-12px_rgba(13,92,58,0.4)] bg-[linear-gradient(135deg,#004328_0%,#005a36_45%,#006D40_100%)]">
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-emerald-300/20 blur-2xl" />
          <div className="relative z-10">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/80">Saldo Ace Points</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-4xl font-extrabold tracking-tight">{pts.balance.toLocaleString("id-ID")}</span>
              <span className="text-xs font-bold text-emerald-200">PTS</span>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm backdrop-blur-md">
              <span className="text-emerald-100/80">Estimasi nilai tunai</span>
              <span className="font-bold text-white">Setara {rupiah(pts.rp)}</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-100/70">
              <span className="font-mono">{phone ? displayPhone(phone) : "Nomor tidak valid"}</span>
              <span>•</span><span>{pts.tierLabel}</span>
            </div>
          </div>
        </div>

        {phone && pts.balance >= 50 ? (
          <TukarPoin phone={phone} balance={pts.balance} />
        ) : (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 text-center text-sm text-slate-400 shadow-sm">
            {phone ? "Poin belum cukup untuk ditukar (minimal 50)." : "Nomor tidak valid."}
          </div>
        )}

        {/* Riwayat penukaran */}
        {history.length > 0 && (
          <section className="space-y-2">
            <h3 className="px-1 text-xs font-bold uppercase tracking-widest text-slate-500">Riwayat Penukaran</h3>
            <div className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{h.note ?? (h.kind === "stringing" ? "Potongan Jasa Stringing" : "Potongan Kasir")}</p>
                    <p className="text-[11px] text-slate-500">{fmt(h.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-extrabold text-red-500">−{h.points} PTS</p>
                    <span className={`text-[10px] font-semibold ${h.status === "used" ? "text-emerald-600" : "text-amber-600"}`}>{h.status === "used" ? "Berhasil" : "Menunggu scan"}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <StringingBottomNav active="leaderboard" phone={phone} />
    </div>
  );
}
