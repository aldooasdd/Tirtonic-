import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed, can } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import { displayPhone } from "@/lib/string-finder/phone";
import { saveMember, reviewCoachApplication } from "./actions";
import { memberDirectory, filterMembers, TIER_LABEL, type MemberQuery } from "@/lib/member-directory";

export const dynamic = "force-dynamic";
export const metadata = { title: "Member Loyalty — Tirtonic" };

const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—");

const rp = (n: number) => "Rp" + n.toLocaleString("id-ID");

type SP = MemberQuery & { page?: string; per?: string };

export default async function MemberPage({ searchParams }: { searchParams: SP }) {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("member")) redirect("/dashboard");

  const { rows: all, hubOnline } = await memberDirectory();
  const shown = filterMembers(all, searchParams);
  const coachCount = all.filter((e) => e.isCoach).length;
  const onlyCoach = searchParams.filter === "coach";
  const branches = [...new Set(all.map((e) => e.branch).filter(Boolean) as string[])].sort();
  const per = [25, 50, 100].includes(Number(searchParams.per)) ? Number(searchParams.per) : 25;
  const pages = Math.max(1, Math.ceil(shown.length / per));
  const page = Math.min(pages, Math.max(1, Number(searchParams.page) || 1));
  const pageRows = shown.slice((page - 1) * per, page * per);
  const qs = (patch: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...searchParams, ...patch })) if (v !== undefined && v !== "") u.set(k, String(v));
    return u.toString();
  };
  const apps = await safeQuery(() => prisma.coachApplication.findMany({ where: { status: "pending" }, orderBy: { createdAt: "asc" } }), []);

  const field = "w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none";

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F1F1A]">Member &amp; Coach</h1>
        <p className="mt-1 text-sm text-[#6B7A74]">
          Semua orang yang pernah transaksi otomatis jadi member. Form di bawah untuk set coach (Green), kode referral, &amp; ultah. Tier &amp; poin dihitung otomatis dari transaksi.
        </p>
      </div>

      {/* Pengajuan Green Card — acc dulu baru resmi coach (+ WA otomatis) */}
      {apps.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
          <div className="border-b bg-emerald-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-emerald-800">
            Pengajuan Green Card · {apps.length}
          </div>
          <ul className="divide-y">
            {apps.map((a) => (
              <li key={a.id} className="flex gap-3 px-4 py-3">
                <a href={a.proof} target="_blank" rel="noreferrer" className="shrink-0">
                  <img src={a.proof} alt="Bukti" className="h-20 w-20 rounded-lg border object-cover" />
                </a>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-gray-900">{a.name}</div>
                  <div className="text-xs text-gray-500">Club: {a.club}</div>
                  <div className="font-mono text-xs text-gray-500">{displayPhone(a.phone)} · {fmtDate(a.createdAt)}</div>
                  <form action={reviewCoachApplication} className="mt-2 flex gap-2">
                    <input type="hidden" name="id" value={a.id} />
                    <button name="decision" value="approve" className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white active:scale-95">Terima</button>
                    <button name="decision" value="reject" className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 active:scale-95">Tolak</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Form set flag member (coach / referral / ultah) */}
      <details className="rounded-2xl border bg-white shadow-sm">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-700">Set coach / referral / ultah</summary>
      <form action={saveMember} className="space-y-3 border-t p-4">
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
      </details>

      {/* Daftar member: search / filter / sort / pagination / export */}
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{shown.length} Member</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5 text-xs font-semibold">
              <Link href={`/dashboard/member?${qs({ filter: undefined, page: undefined })}`} className={`rounded-md px-2.5 py-1 ${!onlyCoach ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                Semua {all.length}
              </Link>
              <Link href={`/dashboard/member?${qs({ filter: "coach", page: undefined })}`} className={`rounded-md px-2.5 py-1 ${onlyCoach ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500"}`}>
                Coach {coachCount}
              </Link>
            </div>
            <a href={`/dashboard/member/export?${qs({ page: undefined, per: undefined })}`} className="rounded-lg border px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              Export CSV
            </a>
          </div>
        </div>

        <form className="grid grid-cols-2 gap-2 border-b bg-gray-50/60 px-4 py-3 text-sm sm:grid-cols-4">
          {onlyCoach && <input type="hidden" name="filter" value="coach" />}
          <input name="q" defaultValue={searchParams.q} placeholder="Cari nama / nomor HP" className={`${field} col-span-2`} />
          <select name="tier" defaultValue={searchParams.tier ?? ""} className={field}>
            <option value="">Semua tier</option>
            {Object.entries(TIER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select name="branch" defaultValue={searchParams.branch ?? ""} className={field}>
            <option value="">Semua cabang</option>
            {branches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select name="status" defaultValue={searchParams.status ?? ""} className={field}>
            <option value="">Semua status</option>
            <option value="aktif">Aktif (transaksi ≤12 bln)</option>
            <option value="nonaktif">Nonaktif</option>
          </select>
          <label className="flex items-center gap-1 text-xs text-gray-500">Join<input type="date" name="from" defaultValue={searchParams.from} className={field} /></label>
          <label className="flex items-center gap-1 text-xs text-gray-500">s/d<input type="date" name="to" defaultValue={searchParams.to} className={field} /></label>
          <select name="sort" defaultValue={searchParams.sort ?? "terbaru"} className={field}>
            <option value="terbaru">Terbaru</option>
            <option value="poin">Poin tertinggi</option>
            <option value="belanja">Total belanja</option>
            <option value="az">A–Z</option>
          </select>
          <select name="per" defaultValue={String(per)} className={field}>
            {[25, 50, 100].map((n) => <option key={n} value={n}>{n} / halaman</option>)}
          </select>
          <div className="col-span-2 flex gap-2 sm:col-span-2">
            <button className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white">Terapkan</button>
            <Link href="/dashboard/member" className="rounded-xl border px-4 py-2 text-sm font-semibold text-gray-600">Bersihkan</Link>
          </div>
        </form>
        {!hubOnline && <p className="border-b bg-amber-50 px-4 py-2 text-xs text-amber-800">Hub (nota offline) tidak terjangkau — poin/belanja pakai salinan terakhir, cabang mungkin kosong.</p>}

        {pageRows.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-400">Tidak ada member yang cocok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-gray-50 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-2">Member</th>
                  <th className="px-3 py-2">Tier</th>
                  <th className="px-3 py-2 text-right">Poin</th>
                  <th className="px-3 py-2 text-right">Belanja</th>
                  <th className="px-3 py-2">Cabang</th>
                  <th className="px-3 py-2">Join</th>
                  <th className="px-3 py-2">Terakhir</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pageRows.map((e) => (
                  <tr key={e.phone} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <Link href={`/dashboard/member/${e.phone}`} className="font-semibold text-gray-900 hover:underline">{e.name || "Tanpa nama"}</Link>
                      {e.isCoach && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">COACH {e.coachCode}</span>}
                      <div className="font-mono text-xs text-gray-500">{displayPhone(e.phone)}</div>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-semibold">{TIER_LABEL[e.tier] ?? e.tier}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{e.points.toLocaleString("id-ID")}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{rp(e.spend)}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-600">{e.branch ?? "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-600">{fmtDate(e.joinedAt)}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-600">{fmtDate(e.lastTx)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-gray-500">
          <span>Hal {page} / {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={`/dashboard/member?${qs({ page: page - 1 })}`} className="rounded-lg border px-3 py-1 font-semibold">← Sebelumnya</Link>}
            {page < pages && <Link href={`/dashboard/member?${qs({ page: page + 1 })}`} className="rounded-lg border px-3 py-1 font-semibold">Berikutnya →</Link>}
          </div>
        </div>
      </div>
    </div>
  );
}
