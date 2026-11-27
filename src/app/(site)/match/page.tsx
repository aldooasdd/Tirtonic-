import type { Metadata } from "next";
import Link from "next/link";
import type { Kat } from "@/lib/compare-shared";
import { itemsMatch } from "@/lib/match-data";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Tirtonic Match — Cari Raket, Senar & Sepatu Tenis yang Cocok",
  description: "Jawab beberapa pertanyaan singkat, dapat 3 raket, senar, atau sepatu tenis yang paling cocok dengan gaya mainmu. Berdasarkan data uji lab, bukan opini.",
  alternates: { canonical: "/match" },
};

const KAT: { k: Kat; judul: string; find: string; opt: string }[] = [
  { k: "raket", judul: "Raket", find: "Jawab soal level, postur, gaya main, dan prioritas. Dapat 3 raket paling pas.", opt: "Dari raket sekarang, pilih yang mau naik: power, kontrol, spin, kenyamanan." },
  { k: "senar", judul: "Senar", find: "Jawab soal frekuensi main, keluhan lengan, dan gaya pukulan. Dapat 3 senar paling pas.", opt: "Dari senar sekarang, cari yang lebih bertenaga, terkontrol, atau awet." },
  { k: "sepatu", judul: "Sepatu", find: "Jawab soal lapangan, lebar kaki, dan gaya gerak. Dapat 3 sepatu paling pas.", opt: "Dari sepatu sekarang, cari yang lebih nyaman, stabil, awet, atau lincah." },
];

export default async function MatchLanding() {
  const data = await Promise.all(KAT.map(async (x) => {
    const it = (await itemsMatch(x.k)).filter((i) => Object.keys(i.nilai).length);
    return { ...x, n: it.length, foto: it.find((i) => i.ready && i.foto)?.foto ?? null };
  }));
  const total = data.reduce((t, x) => t + x.n, 0);
  return (
    <>
      <div className="relative overflow-x-clip bg-[#f7f9fb] [letter-spacing:-0.011em]">
        <div aria-hidden className="ev-orb -top-32 left-1/2 h-[340px] w-[720px] -translate-x-1/2 bg-gradient-to-r from-lime-300/35 via-emerald-300/25 to-sky-300/30" />
        <div aria-hidden className="ev-orb right-10 top-24 hidden h-[360px] w-[360px] bg-gradient-to-bl from-teal-200/40 to-blue-200/30 sm:block" />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-20">
          <header className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-neutral-950 sm:text-6xl">Tirtonic Match</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-lg">
              Temukan perlengkapan tenis yang benar-benar cocok dengan level, gaya, dan kebutuhanmu. Dihitung dari data uji lab, bukan opini atau titipan brand.
            </p>
            <div className="mt-8 flex justify-center gap-8 sm:gap-14">
              {[[String(total), "produk dianalisis"], ["17", "kriteria diukur"], ["60 dtk", "rata-rata selesai"]].map(([a, b]) => (
                <div key={b}><p className="text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">{a}</p><p className="mt-1 text-xs font-medium uppercase tracking-wider text-neutral-500">{b}</p></div>
              ))}
            </div>
          </header>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {data.map((x) => (
              <section key={x.k} className="flex flex-col overflow-hidden rounded-[2rem] border border-white bg-white/80 shadow-[0_20px_45px_-25px_rgba(15,23,42,0.2)] backdrop-blur-xl">
                <div className="relative aspect-[16/10] bg-gray-100">
                  {x.foto && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={x.foto} alt="" className="h-full w-full object-cover" />
                  )}
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-800 backdrop-blur">{x.n} {x.judul.toLowerCase()} dengan data lab</span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="text-2xl font-semibold tracking-tight text-gray-950">{x.judul}</h2>
                  <div className="mt-4 space-y-3">
                    <Link href={`/match/${x.k}/find`} className="group block rounded-2xl bg-neutral-950 p-4 text-white transition hover:bg-neutral-800">
                      <span className="flex items-center justify-between font-semibold">Cari {x.judul.toLowerCase()} ideal <span aria-hidden className="transition group-hover:translate-x-0.5">→</span></span>
                      <span className="mt-1 block text-sm text-white/70">{x.find}</span>
                    </Link>
                    <Link href={`/match/${x.k}/optimize`} className="group block rounded-2xl border border-gray-200 p-4 transition hover:border-gray-900">
                      <span className="flex items-center justify-between font-semibold text-gray-900">Upgrade dari yang sekarang <span aria-hidden className="transition group-hover:translate-x-0.5">→</span></span>
                      <span className="mt-1 block text-sm text-gray-500">{x.opt}</span>
                    </Link>
                  </div>
                </div>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-3xl border border-white bg-white/70 p-5 text-center backdrop-blur-xl sm:p-6">
            <p className="text-sm text-gray-600">Mau sekalian pasang senar dengan tension yang pas? <Link href="/string-finder" className="font-semibold text-gray-950 underline underline-offset-2">Coba String Finder</Link> · Mau membandingkan sendiri? <Link href="/bandingkan" className="font-semibold text-gray-950 underline underline-offset-2">Buka Compare</Link></p>
          </div>

          <section className="mx-auto mt-16 max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-950">Cara kerjanya</h2>
            <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-gray-600">
              <p><b className="text-gray-900">Cari yang ideal.</b> Tiap jawaban memberi bobot ke kriteria lab (power, kontrol, spin, kenyamanan, toleransi, manuver, stabilitas untuk raket). Produk dengan nilai tinggi di kriteria yang kamu butuhkan naik ke atas. Yang tidak cocok dengan batasanmu, misalnya berat raket, keluhan lengan, lebar kaki, atau budget, otomatis turun.</p>
              <p><b className="text-gray-900">Upgrade dari yang sekarang.</b> Kami bandingkan produkmu dengan semua kandidat, kriteria per kriteria. Yang direkomendasikan adalah yang naik di arah yang kamu minta tanpa banyak turun di aspek lain.</p>
              <p>Tidak ada &ldquo;produk terbaik&rdquo; untuk semua orang. Yang ada adalah yang paling cocok untukmu. Rekomendasi hanya dari produk ready, tanpa memihak brand mana pun.</p>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}

export const dynamic = "force-dynamic";
