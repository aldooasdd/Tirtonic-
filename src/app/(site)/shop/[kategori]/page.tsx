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
        <div className="relative overflow-hidden rounded-[2rem]">
        {/* warna di belakang kaca supaya efek liquid glass terlihat; dikurung di dalam kotak */}
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-ball blur-2xl sm:h-72 sm:w-72" />
        <span aria-hidden className="pointer-events-none absolute -bottom-16 left-[20%] h-40 w-80 rounded-full bg-emerald-400/70 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute right-[28%] top-1/2 h-24 w-24 rounded-full bg-teal-300/60 blur-2xl" />
        <header className="liquid-green overflow-hidden rounded-[2rem] px-5 py-7 text-white sm:px-10 sm:py-10">
          <h1 className="relative text-3xl font-extrabold tracking-tight sm:text-5xl">{kat.judul}</h1>
          <div className="relative mt-3 max-w-3xl text-[15px] leading-relaxed text-white/85">
            <p>{kat.intro}</p>
            <details className="group mt-2">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded text-sm font-semibold text-ball outline-none">
                <span className="group-open:hidden">Baca selengkapnya</span><span className="hidden group-open:inline">Tutup</span>
                <svg className="h-4 w-4 transition group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
              </summary>
              <p className="mt-2">{kat.lebih}</p>
              {kat.lab && <p className="mt-2">Bandingkan detail sampai 4 produk di <Link href={`/bandingkan?k=${kat.lab}`} className="font-semibold text-ball underline">Compare</Link>.</p>}
            </details>
          </div>
          {kat.lab && (
            <div className="relative mt-6 flex flex-wrap gap-2">
              {TOP[kat.lab].map((k) => {
                const on = sort === `lab_${k}`;
                const q = new URLSearchParams(Object.entries(searchParams).filter(([a, v]) => a !== "sort" && v) as [string, string][]);
                if (!on) q.set("sort", `lab_${k}`);
                return (
                  <Link key={k} href={`/shop/${kat.slug}${q.toString() ? `?${q}` : ""}`} scroll={false} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${on ? "bg-ball text-gray-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]" : "liquid-chip text-white"}`}>
                    Top {k.toLowerCase()}
                  </Link>
                );
              })}
            </div>
          )}
        </header>
        </div>

        <div className="mt-8">
          <Suspense fallback={null}>
            <ShopKategori slug={kat.slug} grup={opsi} produk={hasil.map(kartu)} total={hasil.length} lab={!!kat.lab} />
          </Suspense>
        </div>
      </div>
      <Footer />
    </>
  );
}
