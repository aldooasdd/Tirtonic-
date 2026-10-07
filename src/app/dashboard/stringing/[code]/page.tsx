import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAuthed, can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { displayPhone } from "@/lib/string-finder/phone";

export const dynamic = "force-dynamic";

// Target QR resep. Dibuka admin/stringer untuk lihat detail + cetak.
export default async function StringingDetailPage({ params }: { params: { code: string } }) {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("stringing")) redirect("/dashboard");
  const result = await prisma.sfResult.findUnique({ where: { code: params.code }, include: { orders: { orderBy: { createdAt: "desc" } } } });
  if (!result) notFound();
  const order = result.orders[0] ?? null;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link href="/dashboard/stringing" className="text-sm text-gray-500 hover:text-primary">← Antrian</Link>
      <h1 className="mt-2 font-mono text-2xl font-extrabold text-primary">{result.code}</h1>
      {order ? (
        <div className="mt-4 rounded-2xl border bg-white p-5 shadow-sm">
          <p className="font-semibold text-gray-900">{order.chosenString ?? "— (3 pilihan)"}</p>
          <p className="mt-1 text-sm text-gray-500">
            {order.customerName ? `${order.customerName} • ` : ""}
            <a href={`https://wa.me/${order.phone}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">{displayPhone(order.phone)}</a>
          </p>
          <p className="mt-1 text-sm text-gray-500">Status: <strong>{order.status}</strong></p>
        </div>
      ) : (
        <p className="mt-4 text-gray-500">Resep ini belum punya pesanan (customer belum isi WhatsApp).</p>
      )}
      <a href={`/api/slip/${result.code}${order?.chosenRank ? `?rank=${order.chosenRank}` : ""}`} target="_blank" rel="noreferrer"
        className="btn-green mt-5 inline-flex">Lihat / cetak resep</a>
    </div>
  );
}
