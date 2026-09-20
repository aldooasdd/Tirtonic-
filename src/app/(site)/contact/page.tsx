import LottieLogo from "@/components/LottieLogo";

export const metadata = { title: "Contact — Tirtonic Tennis Store" };

type IconKey = "globe" | "chat" | "bag" | "cart" | "music" | "instagram" | "building" | "headphones";
type Row = { icon: IconKey; label: string; value: string; href?: string; badge?: string };

// Line/outline icons (stroke = currentColor, no fill) so they match the white text.
const S = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const ICONS: Record<IconKey, React.ReactNode> = {
  globe: (<svg {...S}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9s1.3-6.5 3.8-9z" /></svg>),
  chat: (<svg {...S}><path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z" /></svg>),
  bag: (<svg {...S}><path d="M6 7h12l-1 13H7L6 7z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>),
  cart: (<svg {...S}><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /><path d="M3 4h2l2.3 12a1 1 0 0 0 1 .8h9a1 1 0 0 0 1-.8L21 8H6" /></svg>),
  music: (<svg {...S}><circle cx="6" cy="18" r="3" /><path d="M9 18V4l10-1.5v12" /><circle cx="16" cy="16.5" r="3" /></svg>),
  instagram: (<svg {...S}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" /></svg>),
  building: (<svg {...S}><path d="M3 21h18" /><path d="M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16" /><path d="M15 10h3a1 1 0 0 1 1 1v10" /><path d="M8 8h2M8 12h2M8 16h2" /></svg>),
  headphones: (<svg {...S}><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="13.5" width="4" height="7" rx="1.5" /><rect x="17" y="13.5" width="4" height="7" rx="1.5" /></svg>),
};

const ROWS: Row[] = [
  { icon: "globe", label: "Website", value: "www.tirtonic.com", href: "https://www.tirtonic.com" },
  { icon: "chat", label: "ADMIN 1", value: "081312576998", href: "https://wa.me/6281312576998", badge: "FREE SHIPPING" },
  { icon: "chat", label: "ADMIN 2", value: "085179848167", href: "https://wa.me/6285179848167", badge: "FREE SHIPPING" },
  { icon: "bag", label: "Tokopedia", value: "Tirtonic", href: "https://www.tokopedia.com/tirtonic" },
  { icon: "cart", label: "Shopee", value: "Tirtonic", href: "https://shopee.co.id/tirtonic" },
  { icon: "music", label: "Tiktok Shop", value: "Tirtonic", href: "https://www.tiktok.com/@tirtonic", badge: "LIVE!" },
  { icon: "instagram", label: "Instagram", value: "Tirtonic", href: "https://instagram.com/tirtonic" },
  { icon: "building", label: "Tirtonic Headquarter", value: "Yogyakarta" },
  { icon: "building", label: "Tirtonic Heritage", value: "Solo" },
  { icon: "headphones", label: "Customer Care", value: "085179848167", href: "https://wa.me/6285179848167" },
];

export default function ContactPage() {
  return (
    // no navbar on this page → sm:-mt-20 cancels the layout's desktop top clearance
    <div className="min-h-screen bg-white sm:-mt-20">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <LottieLogo />
        <div className="space-y-4">
          {ROWS.map((r) => {
            const inner = (
              <div className="flex items-center justify-between rounded-full bg-primary px-6 py-4 text-white transition hover:bg-primaryDark">
                <span className="flex items-center gap-3 font-semibold">
                  <span className="shrink-0">{ICONS[r.icon]}</span>
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
