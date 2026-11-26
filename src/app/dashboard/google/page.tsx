import { redirect } from "next/navigation";
import { isAuthed, can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { googleProducts, merchantReady } from "@/lib/google-merchant";
import { PageHeader, StatCard, card } from "@/components/dashboard/ui";
import SyncButton from "./SyncButton";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const metadata = { title: "Google Merchant — Tirtonic" };

export default async function GooglePage() {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("produk")) redirect("/dashboard");
  if (!merchantReady()) {
    return <PageHeader title="Google Merchant" desc="Isi GOOGLE_MERCHANT_ID & GOOGLE_MERCHANT_KEY di Vercel dulu." />;
  }
  let items: any[] = [];
  let err = "";
  try { items = await googleProducts(); } catch (e) { err = (e as Error).message; }
  const nama = new Map((await prisma.product.findMany({ select: { id: true, nama: true } })).map((p) => [p.id, p.nama]));
  const tolak = items.filter((x) => x.productStatus?.itemLevelIssues?.some((i: any) => i.severity === "DISAPPROVED"));
  const ok = items.filter((x) => x.productStatus?.destinationStatuses?.some((d: any) => d.approvedCountries?.length));
  const masalah = items.filter((x) => x.productStatus?.itemLevelIssues?.length);

  return (
    <div>
      <PageHeader title="Google Merchant" desc="Produk dikirim otomatis tiap hari jam 09.00 WIB. Klik untuk kirim sekarang.">
        <SyncButton />
      </PageHeader>
      {err && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon="box" label="Di Google" value={items.length} />
        <StatCard icon="check" tone="green" label="Disetujui" value={ok.length} />
        <StatCard icon="x" tone="red" label="Ditolak" value={tolak.length} />
        <StatCard icon="eye" tone="amber" label="Ada catatan" value={masalah.length} />
      </div>
      <div className={card}>
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs text-[#6B7A74]"><th className="p-3">Produk</th><th className="p-3">Masalah dari Google</th></tr></thead>
          <tbody>
            {masalah.map((x) => (
              <tr key={x.name} className="border-b align-top last:border-0">
                <td className="p-3">{nama.get(x.offerId) || x.productAttributes?.title || x.offerId}</td>
                <td className="p-3">
                  {x.productStatus.itemLevelIssues.map((i: any, k: number) => (
                    <p key={k} className={i.severity === "DISAPPROVED" ? "text-red-600" : "text-amber-700"}>
                      {i.description}{i.attribute ? ` (${i.attribute})` : ""}
                    </p>
                  ))}
                </td>
              </tr>
            ))}
            {!masalah.length && <tr><td className="p-3 text-[#6B7A74]" colSpan={2}>Tidak ada masalah.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
