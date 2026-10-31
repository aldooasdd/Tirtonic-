import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed, can } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import { normalizePhone, displayPhone } from "@/lib/string-finder/phone";
import { saveMember, deleteMember } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Member Loyalty — Tirtonic" };

const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—");

type Entry = { phone: string; name: string | null; isCoach: boolean; coachCode: string | null; referredBy: string | null; birthday: Date | null; registered: boolean };

export default async function MemberPage({ searchParams }: { searchParams: { filter?: string } }) {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("member")) redirect("/dashboard");

  // Daftar member = semua yang pernah transaksi (stringing + web), + flag coach dari Member.
  // ponytail: scan semua transaksi (cukup utk admin). Pagination kalau sudah puluhan ribu.
  const [sfRows, ordRows, memberRows] = await Promise.all([
    safeQuery(() => prisma.sfOrder.findMany({ select: { phone: true, customerName: true }, orderBy: { createdAt: "desc" } }), []),
    safeQuery(() => prisma.order.findMany({ select: { telepon: true, nama: true }, orderBy: { createdAt: "desc" } }), []),
    safeQuery(() => prisma.member.findMany(), []),
  ]);

  const map = new Map<string, Entry>();
  const put = (raw: string, name: string | null) => {
    const p = normalizePhone(raw || "");
    if (!p) return;
    const e = map.get(p);
    if (!e) map.set(p, { phone: p, name: name || null, isCoach: false, coachCode: null, referredBy: null, birthday: null, registered: false });
    else if (!e.name && name) e.name = name;
  };
  for (const o of sfRows) put(o.phone, o.customerName);
  for (const o of ordRows) put(o.telepon, o.nama);
  for (const m of memberRows) {
    const e = map.get(m.phone) ?? { phone: m.phone, name: m.name, isCoach: false, coachCode: null, referredBy: null, birthday: null, registered: false };
    e.isCoach = m.isCoach; e.coachCode = m.coachCode; e.referredBy = m.referredBy; e.birthday = m.birthday; e.registered = true;
    if (!e.name && m.name) e.name = m.name;
    map.set(m.phone, e);
  }

  const refCount = new Map<string, number>();
  for (const m of memberRows) if (m.referredBy) refCount.set(m.referredBy, (refCount.get(m.referredBy) ?? 0) + 1);

  const all = [...map.values()].sort((a, b) => Number(b.isCoach) - Number(a.isCoach) || (a.name || "").localeCompare(b.name || ""));
  const onlyCoach = searchParams.filter === "coach";
  const shown = onlyCoach ? all.filter((e) => e.isCoach) : all;
  const coachCount = all.filter((e) => e.isCoach).length;

  const field = "w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none";

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 pb-20">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900">Member Loyalty</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Semua orang yang pernah transaksi otomatis jadi member. Form di bawah untuk set coach (Green), kode referral, &amp; ultah. Tier &amp; poin dihitung otomatis dari transaksi.
        </p>
      </div>

      {/* Form set flag member (coach / referral / ultah) */}
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
              Semua {all.length}
            </Link>
            <Link href="/dashboard/member?filter=coach" className={`rounded-md px-2.5 py-1 ${onlyCoach ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500"}`}>
              Coach {coachCount}
            </Link>
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-400">{onlyCoach ? "Belum ada coach." : "Belum ada transaksi."}</p>
        ) : (
          <ul className="divide-y">
            {shown.map((e) => (
              <li key={e.phone} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900">{e.name || "—"}</span>
                    {e.isCoach && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">COACH {e.coachCode}</span>}
                    {e.coachCode && refCount.get(e.coachCode) ? (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">{refCount.get(e.coachCode)} murid</span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    <span className="font-mono">{displayPhone(e.phone)}</span>
                    {e.referredBy && <> · dirujuk {e.referredBy}</>}
                    {e.birthday && <> · ultah {fmtDate(e.birthday)}</>}
                  </div>
                </div>
                {e.registered && (
                  <form action={deleteMember}>
                    <input type="hidden" name="phone" value={e.phone} />
                    <button type="submit" className="shrink-0 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 active:scale-95" title="Hapus flag coach/referral (nomor tetap member dari transaksi)">
                      Reset
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
