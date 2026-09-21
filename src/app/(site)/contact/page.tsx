import LottieLogo from "@/components/LottieLogo";

export const metadata = { title: "Contact — Tirtonic Tennis Store" };

type IconKey = "globe" | "chat" | "bag" | "cart" | "music" | "instagram" | "building" | "headphones";
type Row = { icon: IconKey; label: string; value: string; href?: string; badge?: string };

// Line/outline icons (stroke = currentColor, no fill) so they match the white text.
const S = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const ICONS: Record<IconKey, React.ReactNode> = {
  globe: (<svg {...S}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9s1.3-6.5 3.8-9z" /></svg>),
  chat: (<svg width="20" height="20" viewBox="0 0 448 512" fill="currentColor"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zM223.9 438.7c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" /></svg>),
  bag: (<svg {...S}><path d="M6 7h12l-1 13H7L6 7z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>),
  cart: (<svg {...S}><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /><path d="M3 4h2l2.3 12a1 1 0 0 0 1 .8h9a1 1 0 0 0 1-.8L21 8H6" /></svg>),
  music: (<svg {...S}><circle cx="6" cy="18" r="3" /><path d="M9 18V4l10-1.5v12" /><circle cx="16" cy="16.5" r="3" /></svg>),
  instagram: (<svg {...S}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" /></svg>),
  building: (<svg {...S}><path d="M3 21h18" /><path d="M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16" /><path d="M15 10h3a1 1 0 0 1 1 1v10" /><path d="M8 8h2M8 12h2M8 16h2" /></svg>),
  headphones: (<svg {...S}><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="13.5" width="4" height="7" rx="1.5" /><rect x="17" y="13.5" width="4" height="7" rx="1.5" /></svg>),
};

const ROWS: Row[] = [
  { icon: "globe", label: "Website", value: "www.tirtonic.com", href: "https://www.tirtonic.com" },
  { icon: "chat", label: "ADMIN 1", value: "085163215511", href: "https://wa.me/6285163215511", badge: "FREE SHIPPING" },
  { icon: "chat", label: "ADMIN 2", value: "085179848167", href: "https://wa.me/6285179848167", badge: "FREE SHIPPING" },
  { icon: "bag", label: "Tokopedia", value: "Tirtonic", href: "https://www.tokopedia.com/tirtonic" },
  { icon: "cart", label: "Shopee", value: "Tirtonic", href: "https://shopee.co.id/tirtonic" },
  { icon: "music", label: "Tiktok Shop", value: "Tirtonic", href: "https://www.tiktok.com/@tirtonic", badge: "LIVE!" },
  { icon: "instagram", label: "Instagram", value: "tirtonic.id", href: "https://www.instagram.com/tirtonic.id" },
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
