import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed, can } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import { displayPhone } from "@/lib/string-finder/phone";
import { saveMember, deleteMember, importMembers } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Member Loyalty — Tirtonic" };

const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—");

export default async function MemberPage({ searchParams }: { searchParams: { filter?: string } }) {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("member")) redirect("/dashboard");

  const members = await safeQuery(() => prisma.member.findMany({ orderBy: { createdAt: "desc" } }), []);
  // Hitung jumlah murid per kode coach.
  const refCount = new Map<string, number>();
  for (const m of members) if (m.referredBy) refCount.set(m.referredBy, (refCount.get(m.referredBy) ?? 0) + 1);

  const onlyCoach = searchParams.filter === "coach";
  const shown = onlyCoach ? members.filter((m) => m.isCoach) : members;
  const coachCount = members.filter((m) => m.isCoach).length;

  const field = "w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none";

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 pb-20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Member Loyalty</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Kelola coach (Green), kode referral, dan ultah. Tier &amp; poin dari belanja dihitung otomatis dari transaksi.
          </p>
        </div>
        <form action={importMembers}>
          <button type="submit" className="shrink-0 rounded-xl border border-primary px-3 py-2 text-xs font-bold text-primary active:scale-95">
            Impor dari transaksi
          </button>
        </form>
      </div>

      {/* Form tambah/ubah member */}
      <form action={saveMember} className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">No. WhatsApp *</span>
            <input name="phone" required placeholder="08…" inputMode="numeric" className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Nama</span>
            <input name="name" placeholder="Nama member" className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Kode referral coach</span>
            <input name="coachCode" placeholder="Auto kalau kosong & coach" className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Dirujuk oleh (kode coach)</span>
            <input name="referredBy" placeholder="Kode coach perujuk" className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Ultah</span>
            <input type="date" name="birthday" className={field} />
          </label>
          <div className="flex items-end gap-5">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" name="isCoach" className="h-4 w-4 rounded border-gray-300 text-primary" /> Coach (Green)
            </label>
          </div>
        </div>
        <button type="submit" className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-white shadow-sm active:scale-95">
          Simpan Member
        </button>
      </form>

      {/* Daftar member */}
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{shown.length} Member</span>
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5 text-xs font-semibold">
            <Link href="/dashboard/member" className={`rounded-md px-2.5 py-1 ${!onlyCoach ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
              Semua {members.length}
            </Link>
            <Link href="/dashboard/member?filter=coach" className={`rounded-md px-2.5 py-1 ${onlyCoach ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500"}`}>
              Coach {coachCount}
            </Link>
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-400">{onlyCoach ? "Belum ada coach." : "Belum ada member khusus. Member biasa tetap dapat poin dari belanja tanpa didaftar di sini."}</p>
        ) : (
          <ul className="divide-y">
            {shown.map((m) => (
              <li key={m.phone} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900">{m.name || "—"}</span>
                    {m.isCoach && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">COACH {m.coachCode}</span>}
                    {m.invitedPrive && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">PRIVÉ</span>}
                    {m.coachCode && refCount.get(m.coachCode) ? (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">{refCount.get(m.coachCode)} murid</span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    <span className="font-mono">{displayPhone(m.phone)}</span>
                    {m.referredBy && <> · dirujuk {m.referredBy}</>}
                    {m.birthday && <> · ultah {fmtDate(m.birthday)}</>}
                  </div>
                </div>
                <form action={deleteMember}>
                  <input type="hidden" name="phone" value={m.phone} />
                  <button type="submit" className="shrink-0 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 active:scale-95">
                    Hapus
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
