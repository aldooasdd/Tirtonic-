import TirtonicLoader from "@/components/TirtonicLoader";

// Loading di area konten (header situs tetap tampil) saat pindah antar halaman toko.
export default function Loading() {
  return <TirtonicLoader className="h-[75vh]" />;
}
