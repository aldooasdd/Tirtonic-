import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { katBySlug, saring } from "@/lib/shop-kat";
import { rowsKategori, jumlahKategori, kartu } from "@/lib/shop-kat-db";
import { safeQuery } from "@/lib/prisma";
import ShopTabs from "@/components/ShopTabs";
import ShopKategori from "@/components/ShopKategori";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";
type SP = Record<string, string | undefined>;

export function generateMetadata({ params }: { params: { kategori: string } }): Metadata {
  const k = katBySlug(params.kategori);
  return k ? { title: `${k.judul} — Tirtonic`, description: k.intro, alternates: { canonical: `/shop/${k.slug}` } } : {};
}

const TOP: Record<string, string[]> = {
  raket: ["Power", "Kontrol", "Spin", "Kenyamanan", "Manuver", "Stabilitas"],
  senar: ["Power", "Kontrol", "Spin", "Kenyamanan", "Tahan tension"],
  sepatu: ["Kenyamanan", "Stabilitas", "Ketahanan", "Dinamis"],
};

export default async function KategoriPage({ params, searchParams }: { params: { kategori: string }; searchParams: SP }) {
  const kat = katBySlug(params.kategori);
  if (!kat) notFound();
  const [rows, jumlah] = await Promise.all([safeQuery(() => rowsKategori(kat.db), []), safeQuery(() => jumlahKategori(), {})]);
  const { hasil, opsi } = saring(kat, rows, searchParams);
  const sort = searchParams.sort || "";

  return (
    <>
      <ShopTabs aktif={kat.slug} jumlah={jumlah} />
      <div className="mx-auto max-w-[1600px] px-4 pb-10 pt-4">
        <nav className="mb-4 text-sm text-gray-500">
          <Link href="/" className="text-primary hover:underline">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/shop" className="text-primary hover:underline">Shop</Link>
          <span className="mx-2">/</span>
          <span>{kat.judul}</span>
        </nav>
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">{kat.judul}</h1>
        <div className="mt-3 max-w-4xl text-gray-600">
          <p>{kat.intro}</p>
          <details className="group mt-2">
            <summary className="cursor-pointer list-none text-sm font-semibold text-gray-900">
              <span className="group-open:hidden">Baca selengkapnya ⌄</span><span className="hidden group-open:inline">Tutup ⌃</span>
            </summary>
            <p className="mt-2">{kat.lebih}</p>
            {kat.lab && <p className="mt-2">Bandingkan detail sampai 4 produk di <Link href={`/bandingkan?k=${kat.lab}`} className="font-semibold text-primary underline">Compare</Link>.</p>}
          </details>
        </div>

        {kat.lab && (
          <div className="mt-5 flex flex-wrap gap-2">
            {TOP[kat.lab].map((k) => {
              const on = sort === `lab_${k}`;
              const q = new URLSearchParams(Object.entries(searchParams).filter(([a, v]) => a !== "sort" && v) as [string, string][]);
              if (!on) q.set("sort", `lab_${k}`);
              return (
                <Link key={k} href={`/shop/${kat.slug}${q.toString() ? `?${q}` : ""}`} scroll={false} className={`rounded-full px-4 py-2 text-sm font-semibold ${on ? "bg-primaryDark text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"}`}>
                  Top {k.toLowerCase()}
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-6">
          <Suspense fallback={null}>
            <ShopKategori slug={kat.slug} grup={opsi} produk={hasil.map(kartu)} total={hasil.length} lab={!!kat.lab} />
          </Suspense>
        </div>
      </div>
      <Footer />
    </>
  );
}
