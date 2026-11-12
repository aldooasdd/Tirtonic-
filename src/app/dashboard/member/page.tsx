import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed, can } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import { displayPhone } from "@/lib/string-finder/phone";
import { saveMember, reviewCoachApplication } from "./actions";
import { memberDirectory, filterMembers, TIER_LABEL, type MemberQuery } from "@/lib/member-directory";
import { RP_PER_REFERRAL_ACE } from "@/lib/tirtonichub-points";
import { PageHeader, StatCard, Icon, card, btn, btnPrimary } from "@/components/dashboard/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Member & Coach — Tirtonic" };

const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—");
const rp = (n: number) => "Rp" + n.toLocaleString("id-ID");
const num = (n: number) => n.toLocaleString("id-ID");
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
const ago = (d: Date) => {
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  return m < 60 ? `${Math.max(1, m)} menit lalu` : m < 1440 ? `${Math.round(m / 60)} jam lalu` : `${Math.round(m / 1440)} hari lalu`;
};

const APP_TABS = [
  { key: "pending", label: "Menunggu" },
  { key: "approved", label: "Disetujui" },
  { key: "rejected", label: "Ditolak" },
] as const;

type SP = MemberQuery & { page?: string; per?: string; apps?: string };

const th = "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6B7A74]";
const field = "w-full rounded-xl border border-[#E6EAE8] bg-white px-3 py-2 text-sm text-[#0F1F1A] focus:border-primary focus:outline-none";
const pill = "rounded-full px-2 py-0.5 text-[10px] font-semibold";

export default async function MemberPage({ searchParams }: { searchParams: SP }) {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("member")) redirect("/dashboard");

  const appTab = APP_TABS.some((t) => t.key === searchParams.apps) ? searchParams.apps! : "pending";
  const [{ rows: all, hubOnline }, apps, appCounts] = await Promise.all([
    memberDirectory(),
    safeQuery(() => prisma.coachApplication.findMany({ where: { status: appTab }, orderBy: { createdAt: appTab === "pending" ? "asc" : "desc" }, take: 50 }), []),
    safeQuery(() => prisma.coachApplication.groupBy({ by: ["status"], _count: true }), []),
  ]);
  const appCount = (k: string) => appCounts.find((c) => c.status === k)?._count ?? 0;

  // ── Coach & referral (murid = member dengan referredBy = kode coach) ──
  const coaches = all.filter((e) => e.isCoach);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const report = coaches
    .map((c) => {
      const students = all.filter((s) => s.referredBy && s.referredBy === c.coachCode);
      const spend = students.reduce((a, s) => a + s.spendOffline, 0);
      return {
        c,
        students: students.length,
        newThisMonth: students.filter((s) => s.joinedAt && s.joinedAt >= monthStart).length,
        spend,
        refPts: students.reduce((a, s) => a + Math.floor(s.spendOffline / RP_PER_REFERRAL_ACE), 0),
      };
    })
    .sort((a, b) => b.spend - a.spend || b.students - a.students);
  const totStudents = report.reduce((a, r) => a + r.students, 0);
  const totSpend = report.reduce((a, r) => a + r.spend, 0);
  const totRef = report.reduce((a, r) => a + r.refPts, 0);

  // ── Direktori member ──
  const shown = filterMembers(all, searchParams);
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

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-20">
      <PageHeader title="Member & Coach" desc="Verifikasi Green Card coach, pantau referral murid, dan kelola semua member. Tier & poin dihitung otomatis dari transaksi.">
        <a href="#set-member" className={btn}><Icon name="key" /> Set Coach / Referral</a>
        <a href={`/dashboard/member/export?${qs({ page: undefined, per: undefined, apps: undefined })}`} className={btnPrimary}><Icon name="file" /> Export CSV</a>
      </PageHeader>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
        <StatCard icon="users" label="Total Member" value={num(all.length)} note={`${num(all.filter((e) => e.lastTx && Date.now() - e.lastTx.getTime() < 365 * 864e5).length)} aktif 12 bln`} />
        <StatCard icon="star" label="Coach Green" value={num(coaches.length)} tone="green" note="kartu Green aktif" />
        <StatCard icon="clock" label="Verifikasi Pending" value={num(appCount("pending"))} tone={appCount("pending") ? "amber" : "ink"} note={appCount("pending") ? "perlu tindakan" : "tidak ada antrean"} />
        <StatCard icon="handshake" label="Murid Terbawa" value={num(totStudents)} note={`belanja ${rp(totSpend)}`} />
        <StatCard icon="wallet" label="Poin Referral" value={<>{num(totRef)} <span className="text-sm font-medium text-[#9AA6A1]">Ace</span></>} note={`setara ${rp(totRef * 1000)}`} />
      </div>

      {/* Antrean pengajuan Green Card */}
      <div className={`${card} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF1EF] p-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-semibold text-[#0F1F1A]">Pengajuan Kartu Green</h2>
              {appCount("pending") > 0 && <span className={`${pill} bg-amber-50 text-amber-700`}>{appCount("pending")} menunggu</span>}
            </div>
            <p className="mt-0.5 text-xs text-[#6B7A74]">Cek bukti coach, lalu terima → resmi coach + kode referral dikirim lewat WA.</p>
          </div>
          <div className="flex gap-1 rounded-xl bg-[#F3F5F4] p-1 text-xs font-medium">
            {APP_TABS.map((t) => (
              <Link key={t.key} href={`/dashboard/member?${qs({ apps: t.key === "pending" ? undefined : t.key })}`} scroll={false}
                className={`rounded-lg px-3 py-1.5 ${appTab === t.key ? "bg-white text-[#0F1F1A] shadow-sm" : "text-[#6B7A74] hover:text-[#0F1F1A]"}`}>
                {t.label} ({appCount(t.key)})
              </Link>
            ))}
          </div>
        </div>
        {apps.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#9AA6A1]">Tidak ada pengajuan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-[#F8FAF9]"><tr><th className={th}>Coach</th><th className={th}>Club / Homebase</th><th className={th}>Bukti</th><th className={th}>Diajukan</th><th className={`${th} text-right`}>Tindakan</th></tr></thead>
              <tbody className="divide-y divide-[#EEF1EF]">
                {apps.map((a) => (
                  <tr key={a.id} className="hover:bg-[#F8FAF9]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#E8F1EC] text-sm font-semibold text-primary">{initials(a.name)}</span>
                        <div className="min-w-0">
                          <Link href={`/dashboard/member/${a.phone}`} className="font-semibold text-[#0F1F1A] hover:text-primary">{a.name}</Link>
                          <a href={`https://wa.me/${a.phone}`} target="_blank" rel="noreferrer" className="block font-mono text-xs text-[#6B7A74] hover:text-primary">{displayPhone(a.phone)} · WA</a>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#0F1F1A]">{a.club}</td>
                    <td className="px-4 py-3">
                      <a href={a.proof} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[#E6EAE8] p-1 pr-3 text-xs font-medium text-[#0F1F1A] hover:border-primary">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={a.proof} alt="" className="h-9 w-9 rounded-lg object-cover" /> Lihat bukti
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[#0F1F1A]">{fmtDate(a.createdAt)}</div>
                      <div className="text-xs text-[#9AA6A1]">{ago(a.createdAt)}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {a.status === "pending" ? (
                        <form action={reviewCoachApplication} className="inline-flex gap-2">
                          <input type="hidden" name="id" value={a.id} />
                          <button name="decision" value="reject" className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">Tolak</button>
                          <button name="decision" value="approve" className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0E3B2E]">Terima &amp; Kartu Green</button>
                        </form>
                      ) : (
                        <span className={`${pill} ${a.status === "approved" ? "bg-[#E8F1EC] text-primary" : "bg-red-50 text-red-600"}`}>{a.status === "approved" ? "Disetujui" : "Ditolak"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Laporan referral per coach */}
      <div className={`${card} overflow-hidden`}>
        <div className="border-b border-[#EEF1EF] p-5">
          <h2 className="text-[17px] font-semibold text-[#0F1F1A]">Laporan Referral Coach</h2>
          <p className="mt-0.5 text-xs text-[#6B7A74]">Coach dapat 2% belanja offline murid (1 Ace / {rp(RP_PER_REFERRAL_ACE)} belanja murid).</p>
        </div>
        {report.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#9AA6A1]">Belum ada coach.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-[#F8FAF9]"><tr><th className={th}>Coach</th><th className={th}>Status</th><th className={`${th} text-right`}>Murid</th><th className={`${th} text-right`}>Belanja murid</th><th className={`${th} text-right`}>Poin referral</th></tr></thead>
              <tbody className="divide-y divide-[#EEF1EF]">
                {report.map(({ c, students, newThisMonth, spend, refPts }) => (
                  <tr key={c.phone} className="hover:bg-[#F8FAF9]">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/member/${c.phone}`} className="font-semibold text-[#0F1F1A] hover:text-primary">{c.name || "Tanpa nama"}</Link>
                      <div className="font-mono text-xs text-[#9AA6A1]">Kode {c.coachCode ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3"><span className={`${pill} bg-[#E8F1EC] text-primary`}>Green aktif</span></td>
                    <td className="px-4 py-3 text-right tabular-nums">{num(students)}{newThisMonth > 0 && <div className="text-[11px] text-primary">+{newThisMonth} bln ini</div>}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{rp(spend)}</td>
                    <td className="px-4 py-3 text-right tabular-nums"><span className="font-semibold text-primary">{num(refPts)} Ace</span><div className="text-[11px] text-[#9AA6A1]">{rp(refPts * 1000)}</div></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#F8FAF9] text-xs font-semibold text-[#0F1F1A]">
                <tr><td className="px-4 py-3" colSpan={2}>Total</td><td className="px-4 py-3 text-right">{num(totStudents)}</td><td className="px-4 py-3 text-right">{rp(totSpend)}</td><td className="px-4 py-3 text-right">{num(totRef)} Ace</td></tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Direktori member */}
      <div className={`${card} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF1EF] p-5">
          <div>
            <h2 className="text-[17px] font-semibold text-[#0F1F1A]">Semua Member</h2>
            <p className="mt-0.5 text-xs text-[#6B7A74]">{num(shown.length)} member cocok dengan filter.</p>
          </div>
          <div className="flex gap-1 rounded-xl bg-[#F3F5F4] p-1 text-xs font-medium">
            <Link href={`/dashboard/member?${qs({ filter: undefined, page: undefined })}`} scroll={false} className={`rounded-lg px-3 py-1.5 ${!onlyCoach ? "bg-white text-[#0F1F1A] shadow-sm" : "text-[#6B7A74]"}`}>Semua ({num(all.length)})</Link>
            <Link href={`/dashboard/member?${qs({ filter: "coach", page: undefined })}`} scroll={false} className={`rounded-lg px-3 py-1.5 ${onlyCoach ? "bg-white text-primary shadow-sm" : "text-[#6B7A74]"}`}>Coach ({num(coaches.length)})</Link>
          </div>
        </div>

        <form className="grid grid-cols-2 gap-2 border-b border-[#EEF1EF] bg-[#F8FAF9] p-4 sm:grid-cols-4">
          {onlyCoach && <input type="hidden" name="filter" value="coach" />}
          {searchParams.apps && <input type="hidden" name="apps" value={searchParams.apps} />}
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
          <label className="flex items-center gap-2 text-xs text-[#6B7A74]">Join<input type="date" name="from" defaultValue={searchParams.from} className={field} /></label>
          <label className="flex items-center gap-2 text-xs text-[#6B7A74]">s/d<input type="date" name="to" defaultValue={searchParams.to} className={field} /></label>
          <select name="sort" defaultValue={searchParams.sort ?? "terbaru"} className={field}>
            <option value="terbaru">Terbaru</option>
            <option value="poin">Poin tertinggi</option>
            <option value="belanja">Total belanja</option>
            <option value="az">A–Z</option>
          </select>
          <select name="per" defaultValue={String(per)} className={field}>
            {[25, 50, 100].map((n) => <option key={n} value={n}>{n} / halaman</option>)}
          </select>
          <div className="col-span-2 flex gap-2 sm:col-span-3">
            <button className={btnPrimary}>Terapkan</button>
            <Link href="/dashboard/member" className={btn}>Bersihkan</Link>
          </div>
        </form>
        {!hubOnline && <p className="border-b border-[#EEF1EF] bg-amber-50 px-5 py-2 text-xs text-amber-800">Hub (nota offline) tidak terjangkau — poin/belanja pakai salinan terakhir, cabang mungkin kosong.</p>}

        {pageRows.length === 0 ? (
          <p className="p-8 text-center text-sm text-[#9AA6A1]">Tidak ada member yang cocok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-[#F8FAF9]">
                <tr><th className={th}>Member</th><th className={th}>Tier</th><th className={`${th} text-right`}>Poin</th><th className={`${th} text-right`}>Belanja</th><th className={th}>Cabang</th><th className={th}>Join</th><th className={th}>Terakhir</th></tr>
              </thead>
              <tbody className="divide-y divide-[#EEF1EF]">
                {pageRows.map((e) => (
                  <tr key={e.phone} className="hover:bg-[#F8FAF9]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F3F5F4] text-xs font-semibold text-[#6B7A74]">{e.name ? initials(e.name) : "?"}</span>
                        <div className="min-w-0">
                          <Link href={`/dashboard/member/${e.phone}`} className="font-semibold text-[#0F1F1A] hover:text-primary">{e.name || "Tanpa nama"}</Link>
                          {e.isCoach && <span className={`${pill} ml-2 bg-[#E8F1EC] text-primary`}>COACH {e.coachCode}</span>}
                          <div className="font-mono text-xs text-[#9AA6A1]">{displayPhone(e.phone)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`${pill} ${e.tier === "White" ? "bg-[#F3F5F4] text-[#6B7A74]" : "bg-[#E8F1EC] text-primary"}`}>{TIER_LABEL[e.tier] ?? e.tier}</span></td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-[#0F1F1A]">{num(e.points)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#0F1F1A]">{rp(e.spend)}</td>
                    <td className="px-4 py-3 text-xs text-[#6B7A74]">{e.branch ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-[#6B7A74]">{fmtDate(e.joinedAt)}</td>
                    <td className="px-4 py-3 text-xs text-[#6B7A74]">{fmtDate(e.lastTx)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-[#EEF1EF] px-5 py-3 text-xs text-[#6B7A74]">
          <span>Halaman {page} dari {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={`/dashboard/member?${qs({ page: page - 1 })}`} className={btn}>← Sebelumnya</Link>}
            {page < pages && <Link href={`/dashboard/member?${qs({ page: page + 1 })}`} className={btn}>Berikutnya →</Link>}
          </div>
        </div>
      </div>

      {/* Set coach / referral / ultah */}
      <form id="set-member" action={saveMember} className={`${card} scroll-mt-20 space-y-4 p-5`}>
        <div>
          <h2 className="text-[17px] font-semibold text-[#0F1F1A]">Set Coach / Referral / Ultah</h2>
          <p className="mt-0.5 text-xs text-[#6B7A74]">Isi nomor member. Centang Coach untuk kartu Green — kode referral dibuat otomatis kalau kosong.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ["phone", "No. WhatsApp *", "08…"],
            ["name", "Nama", "Nama member"],
            ["coachCode", "Kode referral coach", "Auto kalau kosong & coach"],
            ["referredBy", "Dirujuk oleh (kode coach)", "Kode coach perujuk"],
          ].map(([n, l, ph]) => (
            <label key={n} className="block">
              <span className="mb-1 block text-xs font-medium text-[#6B7A74]">{l}</span>
              <input name={n} required={n === "phone"} placeholder={ph} inputMode={n === "phone" ? "numeric" : undefined} className={field} />
            </label>
          ))}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[#6B7A74]">Ultah</span>
            <input type="date" name="birthday" className={field} />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm font-medium text-[#0F1F1A]">
            <input type="checkbox" name="isCoach" className="h-4 w-4 rounded border-[#E6EAE8] accent-primary" /> Coach (Green)
          </label>
        </div>
        <button type="submit" className={btnPrimary}>Simpan Member</button>
      </form>
    </div>
  );
}
