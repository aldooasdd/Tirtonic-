import Link from "next/link";
import { phaseOf, PHASE_META } from "@/lib/event-phase";
import ShareLinkButton from "@/components/ShareLinkButton";

export type EventCardData = {
  id: string;
  court: string;
  lat: number | null;
  lng: number | null;
  quotaType: string;
  quota: number;
  demoDate: Date;
  time: string;
  timeEnd: string;
  status: string;
  acceptedCount: number;
  campaign: { brand: string; title: string; productType: string; banner: string | null };
  community: { name: string; logo: string | null };
};

// Kartu event horizontal ala Luma: info di kiri, thumbnail di kanan.
// Seluruh kartu nge-link ke detail (stretched link); tombol Daftar & Bagikan di atasnya.
export default function EventCard({ e }: { e: EventCardData }) {
  const phase = phaseOf(e);
  const meta = PHASE_META[phase];
  const open = e.quotaType === "open";
  const sisa = Math.max(0, e.quota - e.acceptedCount);
  const canJoin = open && (phase === "coming_soon" || phase === "ongoing") && sisa > 0;
  // Alamat lapangan: tampilkan 3 kata depan aja (detailnya di halaman event).
  const words = e.court.split(/\s+/).filter(Boolean);
  const shortCourt = words.slice(0, 3).join(" ") + (words.length > 3 ? "…" : "");
  // Google Maps: koordinat kalau ada (dari saran OSM), selain itu cari nama lapangan.
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.lat != null && e.lng != null ? `${e.lat},${e.lng}` : e.court)}`;

  return (
    <div className="group glass-primary relative flex gap-4 rounded-2xl p-3.5 transition">
      {/* Stretched link: klik area kartu mana pun → detail */}
      <Link href={`/event/${e.id}`} aria-label={e.campaign.title} className="absolute inset-0 z-[1] rounded-2xl" />

      <div className="min-w-0 flex-1">
        {e.time && <p className="text-[13px] font-semibold text-white/70">{e.time}{e.timeEnd ? ` – ${e.timeEnd}` : ""}</p>}
        <h3 className="mt-0.5 line-clamp-2 text-[15px] font-bold leading-snug text-white">{e.campaign.title}</h3>

        <div className="mt-2 flex items-center gap-1.5 text-sm text-white/75">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
            {e.community.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.community.logo} alt="" className="h-full w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/logo.png" alt="" className="h-2.5 w-2.5 object-contain" />
            )}
          </span>
          <span className="truncate">{e.community.name}</span>
        </div>

        <p className="mt-1 flex items-center gap-1.5 text-sm text-white/75">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-white/50"><path d="M12 21s-7-4.35-7-10a7 7 0 0 1 14 0c0 5.65-7 10-7 10Z" /><circle cx="12" cy="11" r="2.5" /></svg>
          <span className="truncate">{shortCourt}</span>
          <a href={mapUrl} target="_blank" rel="noreferrer" className="relative z-[2] shrink-0 font-semibold text-white underline-offset-2 hover:underline">
            (Lihat Peta)
          </a>
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.chip}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${open ? "bg-white/15 text-white" : "bg-white/10 text-white/70"}`}>
            {open ? "Open · bisa join" : "Closed"}
          </span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/80">{e.campaign.brand}</span>
          {open && phase !== "done" && <span className="text-[11px] text-white/60">Sisa {sisa}/{e.quota}</span>}
        </div>

        {/* Daftar & Bagikan — di atas stretched link (z-2) biar bisa diklik terpisah */}
        <div className="relative z-[2] mt-3 flex flex-wrap gap-2">
          {canJoin && (
            <Link
              href={`/event/${e.id}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1 text-[11px] font-bold text-primary transition hover:bg-white/90"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>
              Daftar Sekarang
            </Link>
          )}
          <ShareLinkButton
            path={`/event/${e.id}`}
            title={e.campaign.title}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3.5 py-1 text-[11px] font-bold text-white transition hover:bg-white/20"
          />
        </div>
      </div>

      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-primaryDark to-primary sm:h-28 sm:w-28">
        {e.campaign.banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.campaign.banner} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[11px] font-bold uppercase tracking-wide text-white/90">{e.campaign.brand.slice(0, 6)}</span>
        )}
      </div>
    </div>
  );
}
