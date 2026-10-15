import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma, safeQuery } from "@/lib/prisma";
import { currentCommunityId } from "@/lib/community-auth";
import StringingBottomNav from "@/components/StringingBottomNav";
import ClaimForm from "@/components/ClaimForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ajukan Demo — Tirtonic", robots: { index: false } };

export default async function KlaimPage() {
  if (!currentCommunityId()) redirect("/komunitas/login");
  const campaigns = await safeQuery(
    () => prisma.demoCampaign.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" } }),
    [],
  );

  return (
    <div className="mx-auto min-h-screen max-w-md bg-gray-50 pb-24">
      <header className="rounded-b-[1.25rem] bg-gradient-to-br from-primaryDark to-primary px-5 pb-8 pt-10 text-white">
        <Link href="/komunitas" className="mb-5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        <h1 className="text-2xl font-extrabold leading-tight">Ajukan demo</h1>
        <p className="mt-1.5 text-sm text-white/80">Pilih kampanye demo brand, lalu isi detail acara di komunitasmu.</p>
      </header>

      <div className="mt-4 px-4">
        {campaigns.length === 0 ? (
          <p className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400 shadow-sm">
            Belum ada kampanye demo yang tersedia. Pantau terus ya!
          </p>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => {
              const periode = `${c.startDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – ${c.endDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;
              return (
                <details key={c.id} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <summary className="flex cursor-pointer items-start gap-3 p-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primaryDark to-primary">
                      {c.banner ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.banner} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold uppercase text-white">{c.brand.slice(0, 4)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">{c.brand}</span>
                      <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-gray-900">{c.title}</h3>
                      <p className="mt-0.5 text-[11px] text-gray-400">{c.productType} · {periode}</p>
                    </div>
                    <span className="mt-1 shrink-0 text-xs font-bold text-primary group-open:hidden">Klaim →</span>
                  </summary>
                  <div className="border-t border-gray-50 p-4">
                    {c.description && <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-gray-600">{c.description}</p>}
                    <ClaimForm campaignId={c.id} />
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>

      <StringingBottomNav active="event" />
    </div>
  );
}
