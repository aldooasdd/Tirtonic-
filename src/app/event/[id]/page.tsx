import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma, safeQuery } from "@/lib/prisma";
import StringingBottomNav from "@/components/StringingBottomNav";
import JoinEventForm from "@/components/JoinEventForm";
import { phaseOf, PHASE_META } from "@/lib/event-phase";

export const revalidate = 60;

async function getEvent(id: string) {
  return safeQuery(
    () =>
      prisma.demoClaim.findFirst({
        where: { id, status: "accepted" },
        include: {
          campaign: true,
          community: { select: { name: true, logo: true, instagram: true } },
          participants: { select: { status: true } },
        },
      }),
    null,
  );
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const e = await getEvent(params.id);
  if (!e) return {};
  return { title: `Demo ${e.campaign.brand} — ${e.community.name} | Tirtonic`, description: e.campaign.description.slice(0, 155) };
}

export default async function EventDetail({ params }: { params: { id: string } }) {
  const e = await getEvent(params.id);
  if (!e) notFound();

  const phase = phaseOf(e);
  const meta = PHASE_META[phase];
  const open = e.quotaType === "open";
  const accepted = e.participants.filter((p) => p.status === "accepted").length;
  const sisa = Math.max(0, e.quota - accepted);
  const tgl = e.demoDate.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const canJoin = open && (phase === "coming_soon" || phase === "ongoing") && sisa > 0;

  const Row = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 text-primary">{icon}</span>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-gray-50 pb-24">
      <div className="relative h-48 bg-gradient-to-br from-primaryDark to-primary">
        {e.campaign.banner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.campaign.banner} alt="" className="h-full w-full object-cover" />
        )}
        <Link href="/event" className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        <span className={`absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${meta.chip}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      <div className="px-4">
        <div className="-mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">{e.campaign.brand}</span>
          <h1 className="mt-2 text-xl font-extrabold leading-tight text-gray-900">{e.campaign.title}</h1>
          <p className="mt-0.5 text-sm text-gray-400">{e.campaign.productType}</p>

          <div className="mt-3 flex items-center gap-2 border-t border-gray-50 pt-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/5">
              {e.community.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.community.logo} alt="" className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/logo.png" alt="" className="h-4 w-4 object-contain" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{e.community.name}</p>
              <p className="text-xs text-gray-400">@{e.community.instagram}</p>
            </div>
          </div>
        </div>

        {e.campaign.description && (
          <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-1 font-bold text-gray-900">Tentang demo</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">{e.campaign.description}</p>
          </div>
        )}

        <div className="mt-4 divide-y divide-gray-50 rounded-2xl border border-gray-100 bg-white px-5 py-1 shadow-sm">
          <Row icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>} label="Tanggal demo" value={tgl} />
          <Row icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-4.35-7-10a7 7 0 0 1 14 0c0 5.65-7 10-7 10Z" /><circle cx="12" cy="11" r="2.5" /></svg>} label="Lapangan" value={e.court} />
          <Row icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>} label="Kuota peserta" value={open ? `Open · ${accepted}/${e.quota} terisi (sisa ${sisa})` : `Closed · ${e.quota} orang (khusus komunitas)`} />
        </div>

        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          {canJoin ? (
            <>
              <h2 className="mb-3 font-bold text-gray-900">Mau ikut demo ini?</h2>
              <JoinEventForm claimId={e.id} />
            </>
          ) : (
            <p className="text-center text-sm text-gray-500">
              {open
                ? phase === "done"
                  ? "Acara ini sudah selesai."
                  : "Kuota peserta sudah penuh."
                : "Acara ini khusus anggota komunitas penyelenggara — pendaftaran online tidak dibuka."}
            </p>
          )}
        </div>
      </div>

      <StringingBottomNav active="event" />
    </div>
  );
}
