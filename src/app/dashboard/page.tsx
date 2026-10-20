import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed, currentRole, can } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import { rupiah } from "@/lib/format";
import { createProduct, logout, createHeroSlide, deleteHeroSlide, createStore, deleteStore, createPopularBrand, deletePopularBrand, createArticle, createCoupon, deleteCoupon, toggleCoupon, createPreorderProduct, deletePreorderProduct, togglePreorderProduct } from "./actions";
import ProductForm from "@/components/ProductForm";
import ProductList from "@/components/ProductList";
import CouponManager from "@/components/CouponManager";
import PreorderVariantInput from "@/components/PreorderVariantInput";
import ArticleForm from "@/components/ArticleForm";
import ArticleRowActions from "@/components/ArticleRowActions";
import SponsorshipDeleteButton from "@/components/SponsorshipDeleteButton";

export const dynamic = "force-dynamic";
// Tokopedia import via the residential proxy can take longer than the default limit.
export const maxDuration = 60;
export const metadata = { title: "Dashboard Admin — Tirtonic" };

function Stat({ label, value, tone = "gray" }: { label: string; value: number; tone?: "gray" | "green" | "red" }) {
  const tones = {
    gray: "text-gray-900",
    green: "text-primary",
    red: "text-red-500",
  };
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className={`text-2xl font-extrabold ${tones[tone]}`}>{value}</div>
      <div className="mt-0.5 text-xs font-medium text-gray-500">{label}</div>
    </div>
  );
}

export default async function AdminDashboard() {
  if (!isAuthed()) redirect("/dashboard/login");
  const role = currentRole();
  const hasPanel = (["produk", "kupon", "artikel", "hero", "store", "brand", "sponsor"] as const).some((x) => can(x));

  // Role tanpa panel di halaman ini (mis. Stringer) → langsung ke halaman kerjanya.
  const NAV_ROUTE: Record<string, string> = { stringing: "/dashboard/stringing", pesanan: "/dashboard/orders", trafik: "/dashboard/trafik" };
  if (!hasPanel && role && role.sections !== "all") {
    const target = role.sections.map((s) => NAV_ROUTE[s]).find(Boolean);
    if (target) redirect(target);
  }

  const [products, slides, stores, brands, articles, sponsorships, coupons] = await Promise.all([
    safeQuery(() => prisma.product.findMany({ orderBy: { createdAt: "desc" }, include: { variants: { select: { stok: true } } } }), []),
    safeQuery(() => prisma.heroSlide.findMany({ orderBy: [{ urutan: "asc" }, { createdAt: "asc" }] }), []),
    safeQuery(() => prisma.store.findMany({ orderBy: [{ urutan: "asc" }, { nama: "asc" }] }), []),
    safeQuery(() => prisma.popularBrand.findMany({ orderBy: [{ urutan: "asc" }, { nama: "asc" }] }), []),
    safeQuery(() => prisma.article.findMany({ orderBy: { tanggal: "desc" } }), []),
    safeQuery(() => prisma.sponsorshipSubmission.findMany({ orderBy: { createdAt: "desc" } }), []),
    safeQuery(() => prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }), []),
  ]);
  const poProducts = await safeQuery(() => prisma.preorderProduct.findMany({ orderBy: { createdAt: "desc" } }), []);

  const ready = products.filter((p) => p.status === "READY").length;
  const fmtDate = (d: Date) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  const prodName = new Map(products.map((p) => [p.id, p.nama]));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* top bar */}
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" decoding="async" src="/logo.png" alt="" className="h-8 w-8" />
            <div className="leading-tight">
              <div className="text-sm font-extrabold text-gray-900">Tirtonic Admin</div>
              <div className="text-[11px] text-gray-400">Masuk sebagai {role?.label ?? "—"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {can("pesanan") && (
              <Link href="/dashboard/orders" className="text-sm font-medium text-gray-500 hover:text-primary">
                Pesanan
              </Link>
            )}
            {can("stringing") && (
              <Link href="/dashboard/stringing" className="text-sm font-medium text-gray-500 hover:text-primary">
                Stringing
              </Link>
            )}
            {can("event") && (
              <Link href="/dashboard/event" className="text-sm font-medium text-gray-500 hover:text-primary">
                Event
              </Link>
            )}
            {can("trafik") && (
              <Link href="/dashboard/trafik" className="text-sm font-medium text-gray-500 hover:text-primary">
                Trafik
              </Link>
            )}
            <a href="/" target="_blank" rel="noreferrer" className="hidden text-sm font-medium text-gray-500 hover:text-primary sm:block">
              Lihat situs ↗
            </a>
            <Link href="/dashboard/password" className="text-sm font-medium text-gray-500 hover:text-primary">
              Ganti sandi
            </Link>
            <form action={logout}>
              <button className="rounded-full border px-4 py-1.5 text-sm font-semibold text-gray-600 transition hover:border-red-400 hover:text-red-600">
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {/* stats */}
        {hasPanel ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total Produk" value={products.length} />
            <Stat label="Ready" value={ready} tone="green" />
            <Stat label="Artikel" value={articles.length} />
            <Stat label="Hero Slide" value={slides.length} />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed bg-white p-8 text-center">
            <p className="font-semibold text-gray-700">Halo, {role?.label}.</p>
            <p className="mt-1 text-sm text-gray-500">Buka menu di kanan atas untuk mulai kerja.</p>
          </div>
        )}

        {/* add product */}
        {can("produk") && (
        <details className="group overflow-hidden rounded-2xl border bg-white shadow-sm" open>
          <summary className="flex cursor-pointer items-center justify-between px-5 py-4 font-bold text-gray-900">
            <span className="flex items-center gap-2">Tambah Produk</span>
            <span className="text-xs font-normal text-gray-400 group-open:hidden">klik untuk buka</span>
          </summary>
          <div className="border-t p-5">
            <ProductForm action={createProduct} />
          </div>
        </details>
        )}

        {/* add article */}
        {can("artikel") && (
        <details className="group overflow-hidden rounded-2xl border bg-white shadow-sm">
          <summary className="flex cursor-pointer items-center justify-between px-5 py-4 font-bold text-gray-900">
            <span className="flex items-center gap-2">Tambah Artikel</span>
            <span className="text-xs font-normal text-gray-400">{articles.length} artikel</span>
          </summary>
          <div className="border-t p-5">
            <ArticleForm action={createArticle} />
          </div>
        </details>
        )}

        {/* hero banner */}
        {can("hero") && (

        <details className="group overflow-hidden rounded-2xl border bg-white shadow-sm">
          <summary className="flex cursor-pointer items-center justify-between px-5 py-4 font-bold text-gray-900">
            <span className="flex items-center gap-2">Hero Banner (Home)</span>
            <span className="text-xs font-normal text-gray-400">{slides.length} slide</span>
          </summary>
          <div className="space-y-4 border-t p-5">
            <form action={createHeroSlide} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="label">Gambar desktop * (lebar ~2.6:1, mis. 2400×920)</label>
                <input name="gambar" type="file" accept="image/*" required className="text-sm" />
              </div>
              <div>
                <label className="label">Gambar mobile (opsional, kotak 1:1, mis. 1080×1080)</label>
                <input name="gambarMobile" type="file" accept="image/*" className="text-sm" />
              </div>
              <div>
                <label className="label">Link (opsional)</label>
                <input name="link" placeholder="/shop" className="field w-40" />
              </div>
              <div>
                <label className="label">Urutan</label>
                <input name="urutan" type="number" defaultValue={0} className="field w-20" />
              </div>
              <button className="btn-green">Tambah Slide</button>
            </form>

            {slides.length === 0 ? (
              <p className="text-sm text-gray-400">Belum ada banner. Home memakai banner default.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {slides.map((s) => (
                  <div key={s.id} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async" src={s.gambar} alt="" className="h-20 w-36 rounded-lg border object-cover" />
                    {s.gambarMobile && (
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">+ mobile</span>
                    )}
                    <form action={deleteHeroSlide.bind(null, s.id)}>
                      <button className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow">×</button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
        )}

        {/* our store (cabang) */}
        {can("store") && (

        <details className="group overflow-hidden rounded-2xl border bg-white shadow-sm">
          <summary className="flex cursor-pointer items-center justify-between px-5 py-4 font-bold text-gray-900">
            <span className="flex items-center gap-2">Our Store (Cabang)</span>
            <span className="text-xs font-normal text-gray-400">{stores.length} store</span>
          </summary>
          <div className="space-y-4 border-t p-5">
            <form action={createStore} className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Nama store * (mis. Yogyakarta)</label>
                <input name="nama" required className="field" placeholder="Yogyakarta" />
              </div>
              <div>
                <label className="label">Alamat *</label>
                <input name="alamat" required className="field" placeholder="Jl. Sedan Asri No.84, Sleman" />
              </div>
              <div>
                <label className="label">Jam buka (opsional)</label>
                <input name="jam" className="field" placeholder="Everyday | 9am-7pm" />
              </div>
              <div>
                <label className="label">Link Google Maps (opsional)</label>
                <input name="maps" className="field" placeholder="https://maps.app.goo.gl/..." />
              </div>
              <div>
                <label className="label">Foto store (kotak 1:1, mis. 1080×1080)</label>
                <input name="gambar" type="file" accept="image/*" className="text-sm" />
              </div>
              <div>
                <label className="label">Urutan</label>
                <input name="urutan" type="number" defaultValue={0} className="field w-24" />
              </div>
              <div className="sm:col-span-2">
                <button className="btn-green">Tambah Store</button>
              </div>
            </form>

            {stores.length === 0 ? (
              <p className="text-sm text-gray-400">Belum ada store.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {stores.map((s) => (
                  <div key={s.id} className="relative w-40 rounded-xl border p-2">
                    {s.foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img loading="lazy" decoding="async" src={s.foto} alt="" className="mb-2 h-28 w-full rounded-lg border object-cover" />
                    ) : (
                      <div className="mb-2 flex h-28 w-full items-center justify-center rounded-lg border bg-gray-50 text-xs text-gray-300">Tanpa foto</div>
                    )}
                    <p className="truncate text-sm font-semibold text-gray-900">{s.nama}</p>
                    <p className="line-clamp-2 text-xs text-gray-500">{s.alamat}</p>
                    {s.maps && (
                      <a href={s.maps} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-primary hover:underline">
                        Lihat Maps ↗
                      </a>
                    )}
                    <form action={deleteStore.bind(null, s.id)}>
                      <button className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow">×</button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
        )}

        {can("brand") && (

        <details className="group overflow-hidden rounded-2xl border bg-white shadow-sm">
          <summary className="flex cursor-pointer items-center justify-between px-5 py-4 font-bold text-gray-900">
            <span className="flex items-center gap-2">Brand Popular (Home)</span>
            <span className="text-xs font-normal text-gray-400">{brands.length} brand</span>
          </summary>
          <div className="space-y-4 border-t p-5">
            <p className="text-xs text-gray-500">Ukuran foto: <span className="font-semibold">2160×1440 px</span> (rasio 3:2, landscape).</p>
            <form action={createPopularBrand} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="label">Nama brand * (mis. NIKE)</label>
                <input name="nama" required className="field" placeholder="NIKE" />
              </div>
              <div>
                <label className="label">Foto brand * (2160×1440 px, 3:2)</label>
                <input name="gambar" type="file" accept="image/*" required className="text-sm" />
              </div>
              <div>
                <label className="label">Urutan</label>
                <input name="urutan" type="number" defaultValue={0} className="field w-24" />
              </div>
              <button className="btn-green">Tambah Brand</button>
            </form>

            {brands.length === 0 ? (
              <p className="text-sm text-gray-400">Belum ada brand.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {brands.map((b) => (
                  <div key={b.id} className="relative w-40 rounded-xl border p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" decoding="async" src={b.foto} alt="" className="mb-2 h-28 w-full rounded-lg border object-cover" />
                    <p className="truncate text-sm font-semibold text-gray-900">{b.nama}</p>
                    <a href={`/shop?brand=${encodeURIComponent(b.nama)}`} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-primary hover:underline">
                      Lihat di Shop ↗
                    </a>
                    <form action={deletePopularBrand.bind(null, b.id)}>
                      <button className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow">×</button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
        )}

        {/* sponsorship submissions */}
        {can("sponsor") && (

        <details className="group overflow-hidden rounded-2xl border bg-white shadow-sm">
          <summary className="flex cursor-pointer items-center justify-between px-5 py-4 font-bold text-gray-900">
            <span className="flex items-center gap-2">Pengajuan Sponsorship</span>
            <span className="text-xs font-normal text-gray-400">{sponsorships.length} pengajuan</span>
          </summary>
          <div className="space-y-3 border-t p-5">
            {sponsorships.length === 0 ? (
              <p className="text-sm text-gray-400">Belum ada pengajuan sponsorship.</p>
            ) : (
              sponsorships.map((s) => (
                <div key={s.id} className="rounded-xl border p-4 text-sm">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-900">{s.organisasi}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-gray-400">{fmtDate(s.createdAt)}</span>
                      <SponsorshipDeleteButton id={s.id} />
                    </span>
                  </div>
                  <p className="text-gray-600">
                    {s.penanggungJawab}
                    {" · "}
                    <a href={`https://wa.me/${s.noWa.replace(/\D/g, "").replace(/^0/, "62")}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">{s.noWa}</a>
                    {" · "}
                    <a href={`mailto:${s.email}`} className="text-primary hover:underline">{s.email}</a>
                  </p>
                  {[s.namaEvent, s.jenisEvent.join(", "), s.tanggalEvent, s.kota].filter(Boolean).length > 0 && (
                    <p className="mt-1 text-gray-600">
                      {[s.namaEvent, s.jenisEvent.join(", "), s.tanggalEvent, s.kota].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {s.bentuk.length > 0 && (
                    <p className="mt-1 text-gray-500"><span className="text-gray-400">Bentuk:</span> {s.bentuk.join(", ")}</p>
                  )}
                  {s.ringkasan && <p className="mt-1 whitespace-pre-line text-gray-500">{s.ringkasan}</p>}
                  {s.proposalFile && (
                    <a href={s.proposalFile} target="_blank" rel="noreferrer" className="mt-2 inline-block rounded-md border px-3 py-1 text-xs font-semibold text-primary transition hover:border-primary">
                      📎 Lihat Proposal
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </details>
        )}

        {/* produk pre-order */}
        {can("pesanan") && (

        <details className="group overflow-hidden rounded-2xl border bg-white shadow-sm">
          <summary className="flex cursor-pointer items-center justify-between px-5 py-4 font-bold text-gray-900">
            <span className="flex items-center gap-2">Produk Pre-Order</span>
            <span className="text-xs font-normal text-gray-400">{poProducts.length} produk</span>
          </summary>
          <div className="space-y-5 border-t p-5">
            <form action={createPreorderProduct} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="nama" required placeholder="Nama produk *" className="field" />
                <input name="harga" type="number" min={1} required placeholder="Harga (Rp) *" className="field" />
              </div>
              <input name="tagline" placeholder="Subjudul landing (mis. Hello, hello.)" className="field" />
              <div>
                <label className="label">Estimasi tiba</label>
                <input name="estimasi" type="date" className="field" />
              </div>
              <textarea name="deskripsi" rows={3} placeholder="Deskripsi (opsional)" className="field" />
              <div>
                <label className="label">What&apos;s in the Box (satu item per baris)</label>
                <textarea name="isiBox" rows={3} placeholder={"Contoh:\nRaket Tenis\nCover Raket\nKartu Garansi"} className="field" />
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                <p className="mb-2 text-sm font-semibold text-gray-900">Bonus jika bayar penuh (lunas) di awal</p>
                <div className="space-y-2">
                  <input name="bonusNama" placeholder="Nama bonus (mis. Grip Tenis)" className="field" />
                  <textarea name="bonusDeskripsi" rows={2} placeholder="Deskripsi bonus (opsional)" className="field" />
                  <label className="block text-xs text-gray-500">Foto bonus: <input name="bonusFoto" type="file" accept="image/*" className="text-xs" /></label>
                </div>
                <p className="mt-1.5 text-xs text-gray-400">Kosongkan kalau tidak ada bonus. Tampil saat customer pilih bayar penuh.</p>
              </div>

              <PreorderVariantInput />
              <div>
                <label className="label">Foto produk (galeri halaman detail, bisa beberapa)</label>
                <input name="gambar" type="file" accept="image/*" multiple className="text-sm" />
                <p className="mt-1 text-xs text-gray-400">Foto produk biasa (persegi). Tampil di katalog & halaman detail.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Foto banner landing — Desktop</label>
                  <input name="bannerDesktop" type="file" accept="image/*" className="text-sm" />
                  <p className="mt-1 text-xs text-gray-400">Landscape lebar. Ideal <b>1920×820 px</b> (21:9). Objek penting di bawah-tengah (teks menimpa bagian atas).</p>
                </div>
                <div>
                  <label className="label">Foto banner landing — HP</label>
                  <input name="bannerMobile" type="file" accept="image/*" className="text-sm" />
                  <p className="mt-1 text-xs text-gray-400">Lebih tegak. Ideal <b>1080×1350 px</b> (4:5). Objek penting di bawah-tengah.</p>
                </div>
              </div>
              <button className="btn-green">Tambah Produk PO</button>
            </form>

            {poProducts.length === 0 ? (
              <p className="text-sm text-gray-400">Belum ada produk pre-order.</p>
            ) : (
              <div className="divide-y rounded-xl border">
                {poProducts.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded border bg-gray-100">
                      {p.gambar[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img loading="lazy" decoding="async" src={p.gambar[0]} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate font-medium ${p.isActive ? "text-gray-900" : "text-gray-400 line-through"}`}>{p.nama}</p>
                      <p className="text-xs text-gray-400">{rupiah(p.harga)}{p.estimasi ? ` · ${p.estimasi}` : ""}</p>
                    </div>
                    <form action={togglePreorderProduct.bind(null, p.id)}>
                      <button className="rounded-full border px-3 py-1 text-xs font-semibold text-gray-600 transition hover:border-primary hover:text-primary">{p.isActive ? "Nonaktifkan" : "Aktifkan"}</button>
                    </form>
                    <form action={deletePreorderProduct.bind(null, p.id)}>
                      <button className="rounded-full border px-3 py-1 text-xs font-semibold text-gray-500 transition hover:border-red-400 hover:text-red-600">Hapus</button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>

        )}

        {/* kupon diskon */}
        {can("kupon") && (

        <details className="group overflow-hidden rounded-2xl border bg-white shadow-sm">
          <summary className="flex cursor-pointer items-center justify-between px-5 py-4 font-bold text-gray-900">
            <span className="flex items-center gap-2">Kupon Diskon</span>
            <span className="text-xs font-normal text-gray-400">{coupons.length} kupon</span>
          </summary>
          <div className="space-y-5 border-t p-5">
            <CouponManager action={createCoupon} products={products.map((p) => ({ id: p.id, nama: p.nama, kategori: p.kategori }))} />

            {coupons.length === 0 ? (
              <p className="text-sm text-gray-400">Belum ada kupon.</p>
            ) : (
              <div className="divide-y rounded-xl border">
                {coupons.map((c) => {
                  const nama = c.productIds.map((id) => prodName.get(id)).filter(Boolean) as string[];
                  return (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <span className={`rounded-md px-2 py-0.5 font-mono text-xs font-bold ${c.active ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-400 line-through"}`}>{c.code}</span>
                      <span className="font-semibold text-gray-900">{c.type === "amount" ? rupiah(c.value) : `${c.value}%`}</span>
                      <span className="min-w-0 flex-1 truncate text-xs text-gray-500">
                        {c.categories.length > 0
                          ? `Kategori: ${c.categories.join(", ")}`
                          : c.productIds.length === 0
                            ? "Semua produk"
                            : `${c.productIds.length} produk: ${nama.join(", ") || "—"}`}
                      </span>
                      <form action={toggleCoupon.bind(null, c.id)}>
                        <button className="rounded-full border px-3 py-1 text-xs font-semibold text-gray-600 transition hover:border-primary hover:text-primary">
                          {c.active ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </form>
                      <form action={deleteCoupon.bind(null, c.id)}>
                        <button className="rounded-full border px-3 py-1 text-xs font-semibold text-gray-500 transition hover:border-red-400 hover:text-red-600">Hapus</button>
                      </form>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </details>
        )}

        {/* product list (search live di client) */}
        {can("produk") && (

        <ProductList
          products={products.map((p) => ({
            id: p.id,
            nama: p.nama,
            kategori: p.kategori,
            harga: p.harga,
            status: p.status,
            gambar: p.gambar,
            habis: p.status === "SOLD" || (p.variants.length ? p.variants.every((v) => v.stok <= 0) : p.stok != null && p.stok <= 0),
          }))}
        />
        )}

        {/* article list */}
        {can("artikel") && (

        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="font-bold text-gray-900">Daftar Artikel</h2>
            <span className="text-xs text-gray-400">{articles.length} item</span>
          </div>
          {articles.length === 0 ? (
            <p className="px-5 py-12 text-center text-gray-400">Belum ada artikel. Tambahkan lewat panel di atas.</p>
          ) : (
            <ul className="divide-y">
              {articles.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                  {a.gambar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img loading="lazy" decoding="async" src={a.gambar} alt="" className="h-11 w-11 shrink-0 rounded-lg border object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-gray-100 text-[9px] text-gray-300">
                      no img
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-gray-900">{a.judul}</div>
                    <div className="text-xs text-gray-400">{fmtDate(a.tanggal)}{a.tag ? ` · ${a.tag}` : ""}</div>
                  </div>
                  <ArticleRowActions id={a.id} />
                </li>
              ))}
            </ul>
          )}
        </div>
        )}

        <p className="text-center text-xs text-gray-400">
          Perubahan status Ready/Sold langsung tercermin di halaman Shop &amp; detail produk.
        </p>
      </main>
    </div>
  );
}
