"use client";

// Foto dokumentasi demo untuk office: lihat, unduh satu-satu, atau unduh semua.
export default function DemoPhotosAdmin({ photos, baseName }: { photos: string[]; baseName: string }) {
  const dl = (u: string, i: number) => `/dashboard/event/photo?u=${encodeURIComponent(u)}&name=${encodeURIComponent(`${baseName}-${i + 1}`)}`;
  const all = async () => {
    for (const [i, u] of photos.entries()) {
      const a = document.createElement("a");
      a.href = dl(u, i);
      a.click();
      await new Promise((r) => setTimeout(r, 600)); // jeda biar browser tak memblokir unduhan beruntun
    }
  };
  return (
    <div className="mt-3 rounded-xl border bg-gray-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-gray-700">📷 Foto dokumentasi · {photos.length}</p>
        <button type="button" onClick={all} className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-white hover:bg-primaryDark">⬇ Unduh semua</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {photos.map((u, i) => (
          <div key={u} className="relative">
            <a href={u} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`Foto ${i + 1}`} loading="lazy" className="h-20 w-20 rounded-lg object-cover ring-1 ring-black/10" />
            </a>
            <a href={dl(u, i)} title="Unduh" className="absolute bottom-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-[11px] shadow">⬇</a>
          </div>
        ))}
      </div>
    </div>
  );
}
