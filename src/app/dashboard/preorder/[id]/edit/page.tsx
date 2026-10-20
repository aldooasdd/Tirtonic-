import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAuthed, can } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import { updatePreorderProduct } from "@/app/dashboard/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit Produk Pre-Order — Tirtonic" };

export default async function EditPreorderPage({ params }: { params: { id: string } }) {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("pesanan")) redirect("/dashboard");

  const p = await safeQuery(
    () => prisma.preorderProduct.findUnique({ where: { id: params.id }, include: { variants: { orderBy: { urutan: "asc" } } } }),
    null
  );
  if (!p) notFound();

  const action = updatePreorderProduct.bind(null, p.id);
  const imgPreview = (src: string | null | undefined, label: string) =>
    src ? (
      <div className="mt-1 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img loading="lazy" decoding="async" src={src} alt="" className="h-14 w-14 rounded border object-cover" />
        <span className="text-xs text-gray-400">{label} saat ini — kosongkan kalau tidak ganti</span>
      </div>
    ) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/dashboard" className="text-sm text-gray-500 hover:text-primary">← Kembali ke dashboard</Link>
      <h1 className="mb-6 mt-2 text-2xl font-extrabold text-primary">Edit Produk Pre-Order</h1>

      <form action={action} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="nama" required defaultValue={p.nama} placeholder="Nama produk *" className="field" />
          <input name="harga" type="number" min={1} required defaultValue={p.harga} placeholder="Harga (Rp) *" className="field" />
        </div>
        <input name="tagline" defaultValue={p.tagline ?? ""} placeholder="Subjudul landing (mis. Hello, hello.)" className="field" />
        <input name="slogan" defaultValue={p.slogan ?? ""} placeholder="Slogan di bawah nama produk (hero)" className="field" />
        <div>
          <label className="label">Estimasi tiba</label>
          <input name="estimasi" type="date" className="field" />
          {p.estimasi && <p className="mt-1 text-xs text-gray-400">Saat ini: {p.estimasi}. Kosongkan kalau tidak ganti.</p>}
        </div>
        <textarea name="deskripsi" rows={3} defaultValue={p.deskripsi ?? ""} placeholder="Deskripsi (opsional)" className="field" />
        <div>
          <label className="label">What&apos;s in the Box (satu item per baris)</label>
          <textarea name="isiBox" rows={3} defaultValue={p.isiBox.join("\n")} placeholder={"Raket Tenis\nCover Raket"} className="field" />
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
          <p className="mb-2 text-sm font-semibold text-gray-900">Bonus jika bayar penuh (lunas) di awal</p>
          <div className="space-y-2">
            <input name="bonusNama" defaultValue={p.bonusNama ?? ""} placeholder="Nama bonus (mis. Grip Tenis)" className="field" />
            <textarea name="bonusDeskripsi" rows={2} defaultValue={p.bonusDeskripsi ?? ""} placeholder="Deskripsi bonus (opsional)" className="field" />
            <label className="block text-xs text-gray-500">Ganti foto bonus: <input name="bonusFoto" type="file" accept="image/*" className="text-xs" /></label>
            {imgPreview(p.bonusFoto, "Foto bonus")}
          </div>
        </div>

        <div>
          <label className="label">Foto produk (galeri halaman detail)</label>
          <input name="gambar" type="file" accept="image/*" multiple className="text-sm" />
          <p className="mt-1 text-xs text-gray-400">Upload baru = ganti semua foto produk. Kosongkan kalau tidak ganti.</p>
          {p.gambar[0] && (
            <div className="mt-1 flex flex-wrap gap-2">
              {p.gambar.map((g) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={g} loading="lazy" decoding="async" src={g} alt="" className="h-14 w-14 rounded border object-cover" />
              ))}
            </div>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Banner landing — Desktop</label>
            <input name="bannerDesktop" type="file" accept="image/*" className="text-sm" />
            {imgPreview(p.bannerDesktop, "Banner desktop")}
          </div>
          <div>
            <label className="label">Banner landing — HP</label>
            <input name="bannerMobile" type="file" accept="image/*" className="text-sm" />
            {imgPreview(p.bannerMobile, "Banner HP")}
          </div>
        </div>

        {p.variants.length > 0 && (
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
            Produk ini punya {p.variants.length} varian. Varian tidak diubah lewat halaman edit — hapus & buat ulang produk kalau mau ganti varian.
          </p>
        )}

        <button className="btn-green">Simpan Perubahan</button>
      </form>
    </div>
  );
}
