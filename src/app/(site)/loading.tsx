// Spinner di area konten (header situs tetap tampil) saat pindah antar halaman toko.
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-gray-200 border-t-primary" />
    </div>
  );
}
