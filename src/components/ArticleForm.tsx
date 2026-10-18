"use client";

import { useRef } from "react";
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
  const kontenRef = useRef<HTMLTextAreaElement>(null);

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
        <FormatToolbar target={kontenRef} />
        <textarea ref={kontenRef} name="konten" rows={14} required defaultValue={article?.konten} className="field font-mono text-sm" />
        <p className="mt-1 text-xs text-gray-400">Blok teks lalu klik tombol. **tebal**, *miring*, baris diawali ## = judul, ### = sub-judul.</p>
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

// Toolbar format konten: bungkus teks terpilih (tebal/miring) atau beri awalan baris (judul/sub-judul).
function FormatToolbar({ target }: { target: React.RefObject<HTMLTextAreaElement> }) {
  function wrap(mark: string) {
    const t = target.current;
    if (!t) return;
    const { selectionStart: s, selectionEnd: e, value } = t;
    const sel = value.slice(s, e) || "teks";
    t.setRangeText(mark + sel + mark, s, e, "end");
    t.setSelectionRange(s + mark.length, s + mark.length + sel.length);
    t.focus();
  }
  function heading(prefix: string) {
    const t = target.current;
    if (!t) return;
    const { selectionStart: s, value } = t;
    const start = value.lastIndexOf("\n", s - 1) + 1;
    const line = value.slice(start).split("\n")[0];
    const bare = line.replace(/^#{2,3}\s+/, "");
    t.setRangeText(prefix ? `${prefix} ${bare}` : bare, start, start + line.length, "end");
    t.focus();
  }
  const btn = "rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:border-primary hover:text-primary";
  return (
    <div className="mb-1.5 flex flex-wrap gap-1.5">
      <button type="button" onClick={() => wrap("**")} className={`${btn} font-extrabold`} title="Tebal">B</button>
      <button type="button" onClick={() => wrap("*")} className={`${btn} italic`} title="Miring">I</button>
      <button type="button" onClick={() => heading("##")} className={btn} title="Judul besar">Judul</button>
      <button type="button" onClick={() => heading("###")} className={btn} title="Sub-judul">Sub-judul</button>
      <button type="button" onClick={() => heading("")} className={btn} title="Teks biasa">Normal</button>
    </div>
  );
}
