import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed, can } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import RewardScanBox from "@/components/RewardScanBox";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tukar Hadiah — Tirtonic Admin", robots: { index: false } };

const fmt = (d: Date) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export default async function RewardScanPage() {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("stringing")) redirect("/dashboard");

  // Hadiah yang sudah ditukar (10 terakhir) — biar staff lihat riwayat.
  const recent = await safeQuery(
    () => prisma.reward.findMany({ where: { redeemedAt: { not: null } }, orderBy: { redeemedAt: "desc" }, take: 10 }),
    [],
  );

  return (
    <div className="mx-auto min-h-screen max-w-md bg-gray-50 px-4 py-6">
      <Link href="/dashboard/stringing" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        Dashboard stringing
      </Link>
      <h1 className="mt-3 text-xl font-extrabold text-gray-900">Scan Hadiah &amp; Potongan Poin</h1>

      <div className="mt-4">
        <RewardScanBox />
      </div>

      {recent.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Ditukar terakhir</p>
          <div className="space-y-2">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border bg-white p-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-600">{r.rank}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900">{r.name ?? r.phone}</p>
                  <p className="text-xs text-gray-400">{r.period} · {r.redeemedAt ? fmt(r.redeemedAt) : ""}{r.redeemedBy ? ` · ${r.redeemedBy}` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
