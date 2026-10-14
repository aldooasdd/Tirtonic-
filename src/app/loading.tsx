// Umpan balik instan saat pindah halaman (kiosk/dashboard) — biar gak berasa nge-hang.
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-gray-200 border-t-primary" />
    </div>
  );
}
