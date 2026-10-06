import { prisma } from "@/lib/prisma";
import { normalizePhone, displayPhone } from "@/lib/string-finder/phone";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = { antri: "Antri", dikerjakan: "Dikerjakan", selesai: "Selesai", batal: "Batal" };
const badge = (s: string) =>
  s === "selesai" ? "bg-green-100 text-green-700"
  : s === "dikerjakan" ? "bg-blue-100 text-blue-700"
  : s === "antri" ? "bg-amber-100 text-amber-700"
  : s === "batal" ? "bg-red-100 text-red-600"
  : "bg-gray-100 text-gray-600";

// Hitung frekuensi (desc) dari daftar nilai, abaikan kosong.
function tally(vals: (string | null)[]): { label: string; n: number }[] {
  const m = new Map<string, number>();
  for (const v of vals) { if (v) m.set(v, (m.get(v) ?? 0) + 1); }
  return [...m.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n);
}

export default async function RiwayatPage({ params }: { params: { phone: string } }) {
  const phone = normalizePhone(decodeURIComponent(params.phone));
  const orders = phone
    ? await prisma.sfOrder.findMany({
        where: { phone },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { resultCode: true, chosenString: true, tensionLbs: true, racket: true, status: true, createdAt: true, customerName: true },
      })
    : [];

  const name = orders.find((o) => o.customerName)?.customerName ?? null;
  const selesai = orders.filter((o) => o.status === "selesai").length;
  const proses = orders.filter((o) => o.status === "antri" || o.status === "dikerjakan").length;
  const senar = tally(orders.map((o) => o.chosenString));
  const raket = tally(orders.map((o) => o.racket));
  const tensions = orders.map((o) => o.tensionLbs).filter((t): t is number => t != null);
  const avgTension = tensions.length ? Math.round(tensions.reduce((a, b) => a + b, 0) / tensions.length) : null;
  const maxN = Math.max(1, ...senar.map((x) => x.n), ...raket.map((x) => x.n));

  const Bars = ({ rows }: { rows: { label: string; n: number }[] }) => (
    <ul className="space-y-2">
      {rows.slice(0, 6).map((r) => (
        <li key={r.label}>
          <div className="flex justify-between text-sm"><span className="truncate pr-2 text-gray-700">{r.label}</span><span className="shrink-0 font-semibold text-gray-900">{r.n}×</span></div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100"><div className="h-full rounded-full bg-primary" style={{ width: `${(r.n / maxN) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-6">
        <p className="text-sm text-gray-500">{phone ? displayPhone(phone) : "Nomor tidak valid"}</p>
        <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Riwayat Stringing{name ? ` — ${name}` : ""}</h1>

        {orders.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-gray-200 p-8 text-center text-gray-400">
            {phone ? "Belum ada riwayat stringing untuk nomor ini." : "Nomor WhatsApp pada tautan ini tidak valid."}
          </p>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { n: orders.length, l: "Total stringing" },
                { n: selesai, l: "Selesai" },
                { n: proses, l: "Sedang proses" },
                { n: avgTension ? `${avgTension} lbs` : "—", l: "Rata-rata tarikan" },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-2xl font-extrabold text-gray-900">{s.n}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{s.l}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <h2 className="mb-3 font-bold text-gray-900">Senar yang dipakai</h2>
                {senar.length ? <Bars rows={senar} /> : <p className="text-sm text-gray-400">—</p>}
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <h2 className="mb-3 font-bold text-gray-900">Raket yang dipakai</h2>
                {raket.length ? <Bars rows={raket} /> : <p className="text-sm text-gray-400">Belum ada data raket.</p>}
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-5 py-4"><h2 className="font-bold text-gray-900">Semua stringing</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
                      <th className="px-5 py-3">Tanggal</th><th className="px-5 py-3">Senar</th><th className="px-5 py-3">Tarikan</th><th className="px-5 py-3">Raket</th><th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.resultCode} className="border-b border-gray-50 last:border-0">
                        <td className="whitespace-nowrap px-5 py-3 text-gray-500">{new Date(o.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
                        <td className="px-5 py-3 font-medium text-gray-900">{o.chosenString ?? "—"}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-gray-700">{o.tensionLbs ? `${o.tensionLbs} lbs` : "—"}</td>
                        <td className="px-5 py-3 text-gray-700">{o.racket ?? "—"}</td>
                        <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge(o.status)}`}>{STATUS_LABEL[o.status] ?? o.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
      <Footer />
    </>
  );
}
