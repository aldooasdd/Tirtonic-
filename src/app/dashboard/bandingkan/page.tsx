import { redirect } from "next/navigation";
import Link from "next/link";
import { isAuthed, can } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import { compareItems, isKat, KATEGORI, type Kat } from "@/lib/compare";
import { PageHeader, card, btnPrimary } from "@/components/dashboard/ui";
import { tambahPick, hapusPick } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Compare — Tirtonic" };

export default async function DashBandingkan({ searchParams }: { searchParams: { k?: string } }) {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("produk")) redirect("/dashboard");
  const kat: Kat = isKat(searchParams.k) ? searchParams.k : "raket";
  const [items, picks, jumlah] = await Promise.all([
    compareItems({ kategori: kat }),
    safeQuery(() => prisma.comparePick.findMany({ where: { kategori: kat }, orderBy: { urutan: "asc" } }), []),
    safeQuery(() => prisma.compareItem.groupBy({ by: ["kategori"], _count: true }), []),
  ]);
  const nama = new Map(items.map((i) => [i.id, `${i.nama}${i.varian ? ` · ${i.varian}` : ""}`]));
  const label = (i: (typeof items)[number]) => `${i.nama}${i.varian ? ` · ${i.varian}` : ""}${i.skor != null ? ` (${i.skor})` : ""}${i.ready ? "" : " — habis"}`;

  return (
    <div>
      <PageHeader title="Compare" desc="Atur 'Pilihan Tirtonic' yang tampil di halaman /bandingkan.">
        <Link href={`/bandingkan?k=${kat}`} target="_blank" className="text-sm font-medium text-primary">Lihat halaman →</Link>
      </PageHeader>
      <div className="mb-5 flex flex-wrap gap-2">
        {(Object.keys(KATEGORI) as Kat[]).map((k) => (
          <Link key={k} href={`/dashboard/bandingkan?k=${k}`} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${k === kat ? "bg-[#0E3B2E] text-white" : "bg-white text-gray-700 border"}`}>
            {KATEGORI[k].label} ({jumlah.find((j) => j.kategori === k)?._count ?? 0} data)
          </Link>
        ))}
      </div>

      <div className={`${card} mb-6 p-5`}>
        <h2 className="mb-3 font-semibold">Tambah pilihan {KATEGORI[kat].label.toLowerCase()}</h2>
        <form action={tambahPick} className="grid gap-3">
          <input type="hidden" name="kategori" value={kat} />
          <input name="judul" required placeholder="Judul, mis. Raket spin terbaik" className="rounded-xl border px-3 py-2 text-sm" />
          <div className="grid gap-2 md:grid-cols-2">
            {[0, 1, 2, 3].map((n) => (
              <select key={n} name="item" required={n < 2} defaultValue="" className="rounded-xl border px-3 py-2 text-sm">
                <option value="">{n < 2 ? `Barang ${n + 1} (wajib)` : `Barang ${n + 1} (opsional)`}</option>
                {items.map((i) => <option key={i.id} value={i.id}>{label(i)}</option>)}
              </select>
            ))}
          </div>
          <button className={`${btnPrimary} w-fit`}>Simpan</button>
        </form>
      </div>

      <div className={card}>
        {picks.map((p) => (
          <div key={p.id} className="flex items-start justify-between gap-3 border-b p-4 last:border-0">
            <div>
              <p className="font-semibold">{p.judul}</p>
              <p className="text-sm text-[#6B7A74]">{p.itemIds.map((i) => nama.get(i) ?? "(data dihapus)").join(" · ")}</p>
            </div>
            <form action={hapusPick.bind(null, p.id)}><button className="text-sm text-red-600">Hapus</button></form>
          </div>
        ))}
        {!picks.length && <p className="p-4 text-sm text-[#6B7A74]">Belum ada pilihan.</p>}
      </div>
    </div>
  );
}
