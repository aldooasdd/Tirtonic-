import TirtonicLoader from "@/components/TirtonicLoader";

// Umpan balik instan saat pindah halaman (kiosk/dashboard) — biar gak berasa nge-hang.
export default function Loading() {
  return <TirtonicLoader className="h-screen" background="#f9fafb" />;
}
