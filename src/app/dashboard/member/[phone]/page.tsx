import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAuthed, can } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import { normalizePhone, displayPhone } from "@/lib/string-finder/phone";
import { memberDirectory, TIER_LABEL } from "@/lib/member-directory";
import { fetchAcePoints } from "@/lib/tirtonichub-points";
import { deleteMember } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Detail Member — Tirtonic" };

const rp = (n: number) => "Rp" + n.toLocaleString("id-ID");
const fmt = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—");
const ORDER_LABEL: Record<string, string> = { PENDING: "Menunggu bayar", PAID: "Dibayar", SHIPPED: "Dikirim", DELIVERED: "Diterima", CANCELLED: "Batal" };

export default async function MemberDetail({ params }: { params: { phone: string } }) {
  if (!isAuthed()) redirect("/dashboard/login");
  if (!can("member")) redirect("/dashboard");
  const phone = normalizePhone(params.phone);
  if (!phone) notFound();

  const tail = phone.slice(-9); // nomor tersimpan beda format → cari ekor, saring pakai normalisasi
  const [{ rows }, ace, orders, strings, member] = await Promise.all([
    memberDirectory(),
    fetchAcePoints(phone),
    safeQuery(() => prisma.order.findMany({ where: { telepon: { contains: tail } }, include: { items: { select: { nama: true, qty: true } } }, orderBy: { createdAt: "desc" } }), []),
    safeQuery(() => prisma.sfOrder.findMany({ where: { phone: { contains: tail } }, include: { branch: { select: { name: true } } }, orderBy: { createdAt: "desc" } }), []),
    safeQuery(() => prisma.member.findUnique({ where: { phone } }), null),
  ]);
  const e = rows.find((r) => r.phone === phone);
  if (!e) notFound();
  const myOrders = orders.filter((o) => normalizePhone(o.telepon) === phone);
  const myStrings = strings.filter((o) => normalizePhone(o.phone) === phone);
  const notas = [...e.hub].sort((a, b) => b.soldAt.localeCompare(a.soldAt));

  const stat = (label: string, value: React.ReactNode) => (
    <div className="rounded-xl bg-gray-50 px-3 py-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</div>
      <div className="mt-0.5 font-semibold text-gray-900">{value}</div>
    </div>
  );
  const card = "overflow-hidden rounded-2xl border bg-white shadow-sm";
  const head = "border-b px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500";

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      <Link href="/dashboard/member" className="text-sm font-semibold text-gray-500 hover:text-gray-900">← Member</Link>

      <div className={`${card} p-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F1F1A]">{e.name || "Tanpa nama"}</h1>
            <div className="mt-1 font-mono text-sm text-gray-500">{displayPhone(phone)}{e.email && <> · {e.email}</>}</div>
            {e.isCoach && <span className="mt-2 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">COACH {e.coachCode}</span>}
          </div>
          <div className="flex gap-2">
            <a href={`/riwayat/${phone}`} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-gray-700">Lihat dashboard customer ↗</a>
            {member && (
              <form action={deleteMember}>
                <input type="hidden" name="phone" value={phone} />
                <button className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600" title="Nomor tetap member dari transaksi; hanya status coach/referral/ultah yang dihapus">
                  Hapus status coach &amp; referral
                </button>
              </form>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stat("Tier", TIER_LABEL[ace.tier] ?? ace.tierLabel)}
          {stat("Poin (Ace)", `${ace.balance.toLocaleString("id-ID")} · ${rp(ace.rp)}`)}
          {stat("Total belanja", rp(e.spend))}
          {stat("Belanja 12 bln", rp(e.spend12mo))}
          {stat("Transaksi", `${e.txCount}× · stringing ${e.stringCount}×`)}
          {stat("Transaksi terakhir", fmt(e.lastTx))}
          {stat("Join", fmt(e.joinedAt))}
          {stat("Cabang", e.branch ?? "—")}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          {ace.nextTierLabel ? <>Kurang {rp(ace.spendToNext)} lagi ke {ace.nextTierLabel} ({ace.pct}%).</> : <>Tier tertinggi untuk jalurnya.</>}
          {ace.referral > 0 && <> · Referral {ace.referral} Ace</>}
          {ace.redeemed > 0 && <> · Sudah ditukar {ace.redeemed} Ace</>}
          {member?.referredBy && <> · Dirujuk coach {member.referredBy}</>}
          {member?.birthday && <> · Ultah {fmt(member.birthday)}</>}
        </p>
      </div>

      <div className={card}>
        <div className={head}>Nota toko (offline) · {notas.length}</div>
        {notas.length === 0 ? <p className="p-4 text-sm text-gray-400">Belum ada nota sejak 1 Nov 2026.</p> : (
          <ul className="divide-y text-sm">
            {notas.map((n, i) => (
              <li key={i} className="flex justify-between gap-3 px-4 py-2.5">
                <span>{fmt(n.soldAt)} <span className="text-xs text-gray-500">· {n.branchName ?? "—"}</span></span>
                <span className="font-semibold tabular-nums">{rp(n.grandTotal)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={card}>
        <div className={head}>Pesanan online · {myOrders.length}</div>
        {myOrders.length === 0 ? <p className="p-4 text-sm text-gray-400">Belum ada pesanan online.</p> : (
          <ul className="divide-y text-sm">
            {myOrders.map((o) => (
              <li key={o.id} className="flex justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-gray-500">{o.invoice} · {fmt(o.createdAt)} · {ORDER_LABEL[o.status] ?? o.status}</div>
                  <div className="truncate">{o.items.map((it) => `${it.nama}${it.qty > 1 ? ` ×${it.qty}` : ""}`).join(", ")}</div>
                </div>
                <span className="shrink-0 font-semibold tabular-nums">{rp(o.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={card}>
        <div className={`${head} flex justify-between`}>
          <span>Riwayat stringing · {myStrings.length}</span>
          <Link href="/dashboard/stringing" className="normal-case tracking-normal text-primary">Menu Stringing →</Link>
        </div>
        {myStrings.length === 0 ? <p className="p-4 text-sm text-gray-400">Belum pernah stringing.</p> : (
          <ul className="divide-y text-sm">
            {myStrings.map((s) => (
              <li key={s.id} className="flex justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <div className="text-xs text-gray-500">{fmt(s.createdAt)} · {s.branch.name} · {s.status}</div>
                  <div className="truncate">{s.chosenString ?? "—"}{s.tensionLbs ? ` · ${s.tensionLbs}/${s.tensionCrossLbs ?? s.tensionLbs} lbs` : ""}{s.racket ? ` · ${s.racket}` : ""}</div>
                </div>
                <span className="shrink-0 tabular-nums">{s.price ? rp(s.price) : "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
