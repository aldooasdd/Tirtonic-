import LottieLogo from "@/components/LottieLogo";

export const metadata = { title: "Contact — Tirtonic Tennis Store" };

type IconKey = "globe" | "chat" | "bag" | "cart" | "music" | "instagram" | "building" | "headphones";
type Row = { icon: IconKey; label: string; value: string; href?: string; badge?: string };

// Line/outline icons (stroke = currentColor, no fill) so they match the white text.
const S = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const ICONS: Record<IconKey, React.ReactNode> = {
  globe: (<svg {...S}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9s1.3-6.5 3.8-9z" /></svg>),
  chat: (<svg width="20" height="20" viewBox="0 0 448 512" fill="currentColor"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zM223.9 438.7c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" /></svg>),
  bag: (<svg width="20" height="20" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M27.0426,12.9416c-3.4291-2.897-16.85-2.2467-16.85-2.2467L9.72,43.3455s17.8545.133,23.353,0,9.3414-4.5081,9.4005-7.8781,0-24.1813,0-24.1813C35.6155,10.4584,30.5309,11.1088,27.0426,12.9416Z" /><circle cx="19.5311" cy="24.1719" r="6.9765" /><path d="M32.0431,29.33a6.2715,6.2715,0,1,0-2.3-1.7859" /><polyline points="10.193 10.695 5.699 13.947 5.5 39.369 9.72 43.346" /><path d="M33.6953,11.0948a7.7961,7.7961,0,0,0-15.3186-.2988" /><path d="M34.3962,19.662a2.3593,2.3593,0,0,1-3.8777,2.59,4.1944,4.1944,0,1,0,3.8777-2.59Z" /><path d="M20.5239,20.0074a2.4242,2.4242,0,0,1-4.2509,2.2107,4.31,4.31,0,1,0,4.2509-2.2107Z" /><path d="M24.3614,31.4175c0-2.8162,2.0309-3.9612,4.721-3.9612,2.3945,0,3.7543,3.2517,3.7543,3.2517a18.1787,18.1787,0,0,1-7.4495,1.4485,9.9041,9.9041,0,0,0,5.3211,2.5423s-.8278.6208-3.6657.6208C24.7368,35.32,24.3614,32.866,24.3614,31.4175Z" /><path d="M30.317,31.5687a10.3937,10.3937,0,0,1-.2583,3.0083" /></svg>),
  cart: (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.9414 17.9633c.229-1.879-.981-3.077-4.1758-4.0969-1.548-.528-2.277-1.22-2.26-2.1719.065-1.056 1.048-1.825 2.352-1.85a5.2898 5.2898 0 0 1 2.8838.89c.116.072.197.06.263-.039.09-.145.315-.494.39-.62.051-.081.061-.187-.068-.281-.185-.1369-.704-.4149-.983-.5319a6.4697 6.4697 0 0 0-2.5118-.514c-1.909.008-3.4129 1.215-3.5389 2.826-.082 1.1629.494 2.1078 1.73 2.8278.262.152 1.6799.716 2.2438.892 1.774.552 2.695 1.5419 2.478 2.6969-.197 1.047-1.299 1.7239-2.818 1.7439-1.2039-.046-2.2878-.537-3.1278-1.19l-.141-.11c-.104-.08-.218-.075-.287.03-.05.077-.376.547-.458.67-.077.108-.035.168.045.234.35.293.817.613 1.134.775a6.7097 6.7097 0 0 0 2.8289.727 4.9048 4.9048 0 0 0 2.0759-.354c1.095-.465 1.8029-1.394 1.9449-2.554zM11.9986 1.4009c-2.068 0-3.7539 1.95-3.8329 4.3899h7.6657c-.08-2.44-1.765-4.3899-3.8328-4.3899zm7.8516 22.5981-.08.001-15.7843-.002c-1.074-.04-1.863-.91-1.971-1.991l-.01-.195L1.298 6.2858a.459.459 0 0 1 .45-.494h4.9748C6.8448 2.568 9.1607 0 11.9996 0c2.8388 0 5.1537 2.5689 5.2757 5.7898h4.9678a.459.459 0 0 1 .458.483l-.773 15.5883-.007.131c-.094 1.094-.979 1.9769-2.0709 2.0059z" /></svg>),
  music: (<svg width="18" height="18" viewBox="0 0 455 512.098" fill="currentColor"><path fillRule="nonzero" d="M321.331.011h-81.882v347.887c0 45.59-32.751 74.918-72.582 74.918-39.832 0-75.238-29.327-75.238-74.918 0-52.673 41.165-80.485 96.044-74.727v-88.153c-7.966-1.333-15.932-1.77-22.576-1.77C75.249 183.248 0 255.393 0 344.794c0 94.722 74.353 167.304 165.534 167.304 80.112 0 165.097-58.868 165.097-169.96V161.109c35.406 35.406 78.341 46.476 124.369 46.476V126.14C398.35 122.151 335.494 84.975 321.331 0v.011z" /></svg>),
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
  { icon: "headphones", label: "Customer Care", value: "085163215511", href: "https://wa.me/6285163215511" },
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
