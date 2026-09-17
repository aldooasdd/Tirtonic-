"use client";

import { useFormStatus } from "react-dom";

type ArticleInput = {
  id: string;
  judul: string;
  tag: string | null;
  penulis: string;
  tanggal: Date;
  gambar: string | null;
  excerpt: string | null;
  konten: string;
};

function toDateInput(d: Date) {
  return new Date(d).toISOString().slice(0, 10); // YYYY-MM-DD
}

function SaveBtn({ edit }: { edit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-green disabled:opacity-60">
      {pending ? "Menyimpan..." : edit ? "Simpan Perubahan" : "Tambah Artikel"}
    </button>
  );
}

export default function ArticleForm({
  action,
  article,
}: {
  action: (fd: FormData) => void | Promise<void>;
  article?: ArticleInput;
}) {
  const edit = Boolean(article);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label">Judul *</label>
        <input name="judul" required defaultValue={article?.judul} className="field" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label">Tag (pisah koma)</label>
          <input name="tag" defaultValue={article?.tag || ""} placeholder="News, Tips" className="field" />
        </div>
        <div>
          <label className="label">Penulis</label>
          <input name="penulis" defaultValue={article?.penulis || "admin"} className="field" />
        </div>
        <div>
          <label className="label">Tanggal</label>
          <input
            name="tanggal"
            type="date"
            defaultValue={article ? toDateInput(article.tanggal) : toDateInput(new Date())}
            className="field"
          />
        </div>
      </div>

      <div>
        <label className="label">Ringkasan (excerpt)</label>
        <textarea name="excerpt" rows={2} defaultValue={article?.excerpt || ""} className="field" />
      </div>

      <div>
        <label className="label">Konten *</label>
        <textarea name="konten" rows={8} required defaultValue={article?.konten} className="field" />
      </div>

      <div>
        <label className="label">Gambar cover</label>
        {edit && article!.gambar && (
          <div className="mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={article!.gambar} alt="" className="h-20 w-28 rounded-lg border object-cover" />
            <input type="hidden" name="existingGambar" value={article!.gambar} />
          </div>
        )}
        <input name="gambar" type="file" accept="image/*" className="text-sm" />
        {edit && <p className="mt-1 text-xs text-gray-400">Kosongkan kalau tidak ingin ganti gambar.</p>}
      </div>

      <SaveBtn edit={edit} />
    </form>
  );
}
