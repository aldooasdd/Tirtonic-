import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import { normalizePhone } from "@/lib/string-finder/phone";
import { salam } from "@/lib/wa";
import { fetchAcePoints } from "@/lib/tirtonichub-points";
import StringingBottomNav from "@/components/StringingBottomNav";
import VoucherCheck from "@/components/VoucherCheck";

export const dynamic = "force-dynamic";
export const metadata = { title: "Voucher Belanja — Tirtonic", robots: { index: false } };

export default async function VoucherPage({ params }: { params: { phone: string } }) {
  const phone = normalizePhone(decodeURIComponent(params.phone));
  const [pts, vouchers] = await Promise.all([
    fetchAcePoints(phone),
    safeQuery(() => prisma.memberVoucher.findMany({ where: { phone: phone ?? "__none__", status: "active" }, orderBy: { createdAt: "desc" } }), []),
  ]);
  const greeting = `Selamat ${salam()}`;

  return (
    <div className="mx-auto min-h-screen max-w-md bg-[#F8FAFC] pb-28 font-sans text-slate-800 antialiased">
      <header className="relative z-10 px-5 pb-1 pt-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase leading-none tracking-wider text-slate-400">{greeting}</span>
            <h1 className="text-2xl font-extrabold tracking-tight text-emerald-900">Voucher Belanja</h1>
          </div>
          <Link href={`/riwayat/${encodeURIComponent(phone ?? "")}`} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">← Dashboard</Link>
        </div>
        <p className="text-xs text-slate-500">Klaim &amp; gunakan voucher diskon di toko fisik dan online store Tirtonic.</p>
      </header>

      <main className="relative z-10 space-y-5 px-5 pt-4">
        {/* Input kode promo */}
        <VoucherCheck phone={phone ?? ""} />

        {/* Kartu poin */}
        <div className="relative overflow-hidden rounded-3xl p-5 text-white shadow-[0_24px_48px_-12px_rgba(13,92,58,0.4)] bg-[linear-gradient(135deg,#004328_0%,#005a36_45%,#006D40_100%)]">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-300/20 blur-2xl" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-200/80">Tirtonic Member Hub</span>
              <p className="mt-1 text-2xl font-extrabold">Poin Kamu: {pts.balance.toLocaleString("id-ID")} PTS</p>
              <p className="mt-0.5 text-xs text-emerald-100/80">Tukar poin jadi potongan belanja raket, apparel &amp; senar.</p>
            </div>
            <Link href={`/riwayat/${encodeURIComponent(phone ?? "")}/tukar`} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-white backdrop-blur-md">Tukar</Link>
          </div>
        </div>

        {/* Voucher siap pakai (kupon aktif) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold tracking-tight text-slate-900">Voucher Kamu</h3>
            <span className="text-[11px] font-medium text-slate-400">{vouchers.length} Aktif</span>
          </div>
          {vouchers.length === 0 ? (
            <p className="rounded-3xl border border-slate-200/80 bg-white p-6 text-center text-sm text-slate-400 shadow-sm">Belum punya voucher. Menang leaderboard atau klaim kode promo di atas untuk dapat voucher.</p>
          ) : (
            vouchers.map((v) => (
              <div key={v.id} className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
                <div className="flex items-center gap-3 p-4">
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-emerald-50 text-xs font-extrabold uppercase text-emerald-700">
                    Voucher
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{v.label}</span>
                    <p className="mt-1 truncate font-bold text-slate-900">Kode {v.code}</p>
                    <p className="text-[11px] text-slate-500">{v.source === "reward" ? "Hadiah leaderboard" : "Kode promo"}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-dashed border-slate-200 px-4 py-2.5">
                  <span className="text-[11px] text-slate-500">Pakai di checkout atau kasir</span>
                  <Link href="/shop" className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white active:scale-95">Pakai Sekarang</Link>
                </div>
              </div>
            ))
          )}
        </section>

        {/* Panduan */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-800">Panduan Penggunaan Voucher</div>
          <ol className="space-y-2.5 text-xs leading-snug text-slate-600">
            <li className="flex gap-2.5"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-700">1</span><span><strong className="text-slate-800">Belanja di aplikasi/web:</strong> masukkan kode voucher di halaman checkout sebelum pembayaran.</span></li>
            <li className="flex gap-2.5"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-700">2</span><span><strong className="text-slate-800">Belanja di Pro Shop:</strong> tunjukkan kode voucher ke kasir saat transaksi.</span></li>
          </ol>
        </section>
      </main>

      <StringingBottomNav active="shop" phone={phone} />
    </div>
  );
}
