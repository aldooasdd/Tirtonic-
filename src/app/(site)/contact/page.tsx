import Logo from "@/components/Logo";

export const metadata = { title: "Contact — Tirtonic Tennis Store" };

type Row = { icon: string; label: string; value: string; href?: string; badge?: string };

const ROWS: Row[] = [
  { icon: "🌐", label: "Website", value: "www.tirtonic.com", href: "https://www.tirtonic.com" },
  { icon: "💬", label: "ADMIN 1", value: "081312576998", href: "https://wa.me/6281312576998", badge: "FREE SHIPPING" },
  { icon: "💬", label: "ADMIN 2", value: "085179848167", href: "https://wa.me/6285179848167", badge: "FREE SHIPPING" },
  { icon: "🛍️", label: "Tokopedia", value: "Tirtonic", href: "https://www.tokopedia.com/tirtonic" },
  { icon: "🛒", label: "Shopee", value: "Tirtonic", href: "https://shopee.co.id/tirtonic" },
  { icon: "🎵", label: "Tiktok Shop", value: "Tirtonic", href: "https://www.tiktok.com/@tirtonic", badge: "LIVE!" },
  { icon: "📷", label: "Instagram", value: "Tirtonic", href: "https://instagram.com/tirtonic" },
  { icon: "🏬", label: "Tirtonic Headquarter", value: "Yogyakarta" },
  { icon: "🏬", label: "Tirtonic Heritage", value: "Solo" },
  { icon: "🎧", label: "Customer Care", value: "085179848167", href: "https://wa.me/6285179848167" },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="space-y-4">
          {ROWS.map((r) => {
            const inner = (
              <div className="flex items-center justify-between rounded-full bg-primary px-6 py-4 text-white transition hover:bg-primaryDark">
                <span className="flex items-center gap-3 font-semibold">
                  <span>{r.icon}</span>
                  {r.label}
                  {r.badge && (
                    <span className="rounded bg-red-500 px-2 py-0.5 text-[10px] font-bold">{r.badge}</span>
                  )}
                </span>
                <span className="font-bold">{r.value}</span>
              </div>
            );
            return r.href ? (
              <a key={r.label} href={r.href} target="_blank" rel="noreferrer" className="block">
                {inner}
              </a>
            ) : (
              <div key={r.label}>{inner}</div>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <span className="btn-pill">GARANSI TUKAR UKURAN</span>
        </div>
      </div>
    </div>
  );
}
