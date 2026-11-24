"use client";

import { useEffect, useRef, useState } from "react";
import { saveRail } from "@/app/dashboard/rak/actions";
import { RAIL_W, RAIL_H, SHOE_W, SHOE_H, alphaBox, railPhotoProblem, type JenisRak } from "@/lib/rail";

type Item = { id: string; nama: string; foto: string | null; dipakai: boolean; jenis: JenisRak };

/** Potong area kosong, samakan ukuran, kompres. Raket: tepi atas frame pas di atas kanvas (kait). Sepatu: sol pas di bawah kanvas (plat). */
async function prepare(file: File, jenis: JenisRak): Promise<File> {
  const img = await createImageBitmap(file);
  const k = Math.min(1, 2400 / Math.max(img.width, img.height));
  const src = document.createElement("canvas");
  src.width = Math.round(img.width * k);
  src.height = Math.round(img.height * k);
  const sctx = src.getContext("2d", { willReadFrequently: true })!;
  sctx.drawImage(img, 0, 0, src.width, src.height);
  img.close();
  const box = alphaBox(sctx.getImageData(0, 0, src.width, src.height).data, src.width, src.height);
  const problem = railPhotoProblem(box, jenis);
  if (problem || !box) throw new Error(problem ?? "Fotonya kosong.");
  const out = document.createElement("canvas");
  const [W, H] = jenis === "sepatu" ? [SHOE_W, SHOE_H] : [RAIL_W, RAIL_H];
  out.width = W;
  out.height = H;
  const scale = Math.min(W / box.w, H / box.h);
  const w = box.w * scale;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, box.x, box.y, box.w, box.h, (W - w) / 2, jenis === "sepatu" ? H - box.h * scale : 0, w, box.h * scale);
  const blob = await new Promise<Blob | null>((r) => out.toBlob(r, "image/webp", 0.88)); // Safari lama: jatuh ke PNG
  if (!blob) throw new Error("Foto gagal diproses.");
  return new File([blob], blob.type === "image/webp" ? `${jenis}.webp` : `${jenis}.png`, { type: blob.type });
}

export default function RailForm({ items }: { items: Item[] }) {
  const [jenis, setJenis] = useState<JenisRak>("raket");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Item | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const found = items.filter((x) => x.jenis === jenis && words.every((w) => x.nama.toLowerCase().includes(w)));

  async function onFile(f?: File) {
    setMsg(null);
    setFile(null);
    if (!f) return;
    setBusy(true);
    try { setFile(await prepare(f, jenis)); } catch (e) { setMsg({ ok: false, text: e instanceof Error && e.name === "Error" ? e.message : "File ini bukan gambar yang bisa dibaca." }); if (input.current) input.current.value = ""; }
    setBusy(false);
  }

  function ganti(j: JenisRak) {
    if (j === jenis) return;
    setJenis(j); setFile(null); setPicked(null); setQ(""); setMsg(null);
    if (input.current) input.current.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !picked) return setMsg({ ok: false, text: !file ? "Pilih foto dulu." : "Pilih barangnya dulu." });
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.set("gambar", file);
    fd.set("productId", picked.id);
    try {
      const r = await saveRail(fd);
      if (r.error) setMsg({ ok: false, text: r.error });
      else {
        setMsg({ ok: true, text: `${picked.nama} sudah masuk rak.` });
        setFile(null); setPicked(null); setQ("");
        if (input.current) input.current.value = "";
      }
    } catch { setMsg({ ok: false, text: "Gagal menyimpan. Coba lagi." }); }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 md:grid-cols-[220px_1fr]">
      <div role="group" aria-label="Jenis barang" className="flex gap-2 md:col-span-2">
        {(["raket", "sepatu"] as const).map((j) => (
          <button key={j} type="button" disabled={busy} aria-pressed={jenis === j} onClick={() => ganti(j)} className={`min-h-10 rounded-full border px-5 text-sm font-semibold transition-colors ${jenis === j ? "border-primary bg-primary text-white" : "bg-white text-gray-700 hover:border-primary"}`}>{j === "raket" ? "Raket" : "Sepatu"}</button>
        ))}
      </div>
      <div>
        <label className="label" htmlFor="rail-foto">1. Foto {jenis}</label>
        <label htmlFor="rail-foto" className="flex h-72 cursor-pointer items-center justify-center rounded-2xl border border-dashed bg-gray-50 p-3 text-center text-xs text-gray-500 hover:border-primary">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview ? <img src={preview} alt={`Pratinjau ${jenis}`} className="h-full w-full object-contain" /> : busy ? "Memproses…" : "Klik untuk pilih foto"}
        </label>
        <input ref={input} id="rail-foto" type="file" accept="image/png,image/webp" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        <p className="mt-2 text-xs text-gray-500">{jenis === "raket" ? "PNG background transparan, satu raket tegak dari depan." : "PNG background transparan, satu sepatu dari samping, ujung menghadap kiri."} Tepi kosong dipotong otomatis.</p>
      </div>
      <div className="min-w-0">
        <label className="label" htmlFor="rail-cari">2. Pilih barang</label>
        <input id="rail-cari" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Cari nama ${jenis}`} className="field" autoComplete="off" />
        <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border">
          {found.length === 0 && <p className="p-4 text-sm text-gray-400">Tidak ada barang yang cocok.</p>}
          {found.map((x) => (
            <button key={x.id} type="button" aria-pressed={picked?.id === x.id} onClick={() => setPicked(x)} className={`flex w-full items-center gap-3 border-b px-3 py-2 text-left text-sm last:border-0 ${picked?.id === x.id ? "bg-primary/10 font-semibold text-primary" : "hover:bg-gray-50"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {x.foto ? <img loading="lazy" src={x.foto} alt="" className="size-9 shrink-0 rounded-lg border object-cover" /> : <span className="size-9 shrink-0 rounded-lg border bg-gray-50" />}
              <span className="min-w-0 flex-1 truncate">{x.nama}</span>
              {x.dipakai && <span className="shrink-0 text-xs font-normal text-gray-400">sudah di rak</span>}
            </button>
          ))}
        </div>
        {picked?.dipakai && <p className="mt-2 text-xs text-amber-700">Barang ini sudah di rak. Menyimpan akan mengganti fotonya.</p>}
        {msg && <p role="status" className={`mt-3 text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
        <button disabled={busy} className="btn-green mt-4 disabled:cursor-wait disabled:opacity-60">{busy ? "Memproses…" : "Pasang di rak"}</button>
      </div>
    </form>
  );
}
