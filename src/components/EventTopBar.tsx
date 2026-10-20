import Link from "next/link";

// Top-bar putih bersama untuk semua halaman event/komunitas (gaya Luma).
export default function EventTopBar({ right }: { right?: React.ReactNode }) {
  return (
    <header className="border-b border-gray-100 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/event" className="flex items-center gap-2.5 transition hover:opacity-90">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" decoding="async" src="/logo.png" alt="Tirtonic" className="h-9 w-9 object-contain" />
          <span className="text-sm font-semibold tracking-tight text-gray-900">Tirtonic Event</span>
        </Link>
        {right}
      </div>
    </header>
  );
}
