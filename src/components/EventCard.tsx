import Link from "next/link";
import { phaseOf, PHASE_META } from "@/lib/event-phase";

export type EventCardData = {
  id: string;
  court: string;
  quotaType: string;
  quota: number;
  demoDate: Date;
  status: string;
  acceptedCount: number;
  campaign: { brand: string; title: string; productType: string; banner: string | null };
  community: { name: string; logo: string | null };
};

// Kartu event horizontal ala Luma: info di kiri, thumbnail di kanan.
export default function EventCard({ e }: { e: EventCardData }) {
  const phase = phaseOf(e);
  const meta = PHASE_META[phase];
  const open = e.quotaType === "open";
  const sisa = Math.max(0, e.quota - e.acceptedCount);

  return (
    <Link
      href={`/event/${e.id}`}
      className="group flex gap-4 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm transition hover:border-primary/40 hover:shadow-md"
    >
      <div className="min-w-0 flex-1">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.chip}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
        <h3 className="mt-2 line-clamp-2 text-[15px] font-bold leading-snug text-gray-900 group-hover:text-primary">{e.campaign.title}</h3>

        <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/5">
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

        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-400"><path d="M12 21s-7-4.35-7-10a7 7 0 0 1 14 0c0 5.65-7 10-7 10Z" /><circle cx="12" cy="11" r="2.5" /></svg>
          <span className="truncate">{e.court}</span>
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${open ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-600"}`}>
            {open ? "Open · bisa join" : "Closed"}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">{e.campaign.brand}</span>
          {open && phase !== "done" && <span className="text-[11px] text-gray-400">Sisa {sisa}/{e.quota}</span>}
        </div>
      </div>

      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-primaryDark to-primary sm:h-28 sm:w-28">
        {e.campaign.banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.campaign.banner} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[11px] font-bold uppercase tracking-wide text-white/90">{e.campaign.brand.slice(0, 6)}</span>
        )}
      </div>
    </Link>
  );
}
