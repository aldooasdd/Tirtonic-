import { prisma } from "@/lib/prisma";
import { normalizePhone, displayPhone } from "@/lib/string-finder/phone";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = { antri: "Antri", dikerjakan: "Dikerjakan", selesai: "Selesai", batal: "Batal" };
const badge = (s: string) =>
  s === "selesai" ? "bg-green-100 text-green-700"
  : s === "dikerjakan" ? "bg-blue-100 text-blue-700"
  : s === "antri" ? "bg-amber-100 text-amber-700"
  : s === "batal" ? "bg-red-100 text-red-600"
  : "bg-gray-100 text-gray-600";

const fmt = (x: number | null | undefined, d = 1) => (x == null ? "—" : (Math.round(x * 10 ** d) / 10 ** d).toString().replace(".", ","));

function tally(vals: (string | null)[]): { label: string; n: number }[] {
  const m = new Map<string, number>();
  for (const v of vals) { if (v) m.set(v, (m.get(v) ?? 0) + 1); }
  return [...m.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n);
}

// Spec TWU per senar: material, gauge + metrik lab pada kondisi acuan (51M → 51F → apa saja).
type SenarSpec = { material: string; gauge: number | null; st: number | null; sp: number | null; er: number | null };
async function senarSpecs(names: string[]): Promise<Record<string, SenarSpec>> {
  if (!names.length) return {};
  const rows = await prisma.twuString.findMany({ where: { name: { in: names } }, include: { measurements: true } });
  const out: Record<string, SenarSpec> = {};
  for (const r of rows) {
    const ms = r.measurements;
    const ref = ms.find((m) => m.tensionLbs === 51 && m.swing === "M") ?? ms.find((m) => m.tensionLbs === 51) ?? ms[0];
    out[r.name] = { material: r.material, gauge: r.gaugeMm, st: ref?.stiffnessLbIn ?? null, sp: ref?.spinPotential ?? null, er: ref?.energyReturnPct ?? null };
  }
  return out;
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
  const specs = await senarSpecs(senar.map((s) => s.label));

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-8">
      <p className="text-sm text-gray-500">{phone ? displayPhone(phone) : "Nomor tidak valid"}</p>
      <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Riwayat Stringing{name ? ` — ${name}` : ""}</h1>
      <p className="mt-1 text-sm text-gray-400">Tirtonic Tennis Store · data lab: Tennis Warehouse University</p>

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
            {/* Senar + spec TWU */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 font-bold text-gray-900">Senar yang dipakai</h2>
              <ul className="space-y-3">
                {senar.map((s) => {
                  const sp = specs[s.label];
                  return (
                    <li key={s.label} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="font-medium text-gray-900">{s.label}</span>
                        <span className="shrink-0 font-semibold text-gray-500">{s.n}×</span>
                      </div>
                      {sp ? (
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                          <span>{sp.material}</span>
                          {sp.gauge != null && <span>{fmt(sp.gauge, 2)} mm</span>}
                          {sp.st != null && <span>Kekakuan {fmt(sp.st, 0)} lb/in</span>}
                          {sp.sp != null && <span>Spin {fmt(sp.sp)}</span>}
                          {sp.er != null && <span>Energi {fmt(sp.er)}%</span>}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-[11px] text-gray-400">Diukur pada 51 lbs (acuan lab TWU).</p>
            </div>

            {/* Raket + spec TWU */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 font-bold text-gray-900">Raket yang dipakai</h2>
              {raket.length ? (
                <ul className="space-y-3">
                  {raket.map((r) => (
                    <li key={r.label} className="flex justify-between gap-2 border-b border-gray-50 pb-3 text-sm last:border-0 last:pb-0">
                      <span className="font-medium text-gray-900">{r.label}</span>
                      <span className="shrink-0 font-semibold text-gray-500">{r.n}×</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-gray-400">Belum ada data raket.</p>}
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
  );
}
