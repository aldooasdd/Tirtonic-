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

export default function EventCard({ e }: { e: EventCardData }) {
  const phase = phaseOf(e);
  const meta = PHASE_META[phase];
  const tgl = e.demoDate.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  const open = e.quotaType === "open";
  const sisa = Math.max(0, e.quota - e.acceptedCount);

  return (
    <Link
      href={`/event/${e.id}`}
      className="block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative h-32 bg-gradient-to-br from-primaryDark to-primary">
        {e.campaign.banner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.campaign.banner} alt="" className="h-full w-full object-cover" />
        )}
        <span className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.chip}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
        <span className="absolute left-3 top-3 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
          {e.campaign.brand}
        </span>
      </div>

      <div className="p-4">
        <h3 className="line-clamp-2 font-bold leading-snug text-gray-900">{e.campaign.title}</h3>
        <p className="mt-0.5 text-xs text-gray-400">{e.campaign.productType}</p>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/5">
            {e.community.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.community.logo} alt="" className="h-full w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/logo.png" alt="" className="h-4 w-4 object-contain" />
            )}
          </div>
          <span className="truncate text-sm font-semibold text-gray-700">{e.community.name}</span>
        </div>

        <div className="mt-3 space-y-1.5 text-xs text-gray-500">
          <p className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-primary"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
            {tgl}
          </p>
          <p className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-primary"><path d="M12 21s-7-4.35-7-10a7 7 0 0 1 14 0c0 5.65-7 10-7 10Z" /><circle cx="12" cy="11" r="2.5" /></svg>
            {e.court}
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${open ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
            {open ? "Open · bisa join" : "Closed · komunitas"}
          </span>
          {open && phase !== "done" && (
            <span className="text-[11px] font-semibold text-gray-500">Sisa {sisa}/{e.quota}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
