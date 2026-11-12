import { isAuthed, can } from "@/lib/auth";
import { memberDirectory, filterMembers, TIER_LABEL } from "@/lib/member-directory";
import { displayPhone } from "@/lib/string-finder/phone";

// Export CSV daftar member (filter sama dengan halaman). Section "member" = Bos + Admin saja (data pribadi).
export async function GET(req: Request) {
  if (!isAuthed() || !can("member")) return new Response("Forbidden", { status: 403 });
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const { rows } = await memberDirectory();
  const d = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : "");
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Nama", "No HP", "Email", "Cabang", "Tier", "Poin", "Total belanja", "Belanja 12 bln", "Jumlah transaksi", "Stringing", "Join", "Transaksi terakhir", "Kode coach", "Dirujuk"];
  const body = filterMembers(rows, sp).map((e) =>
    [e.name, displayPhone(e.phone), e.email, e.branch, TIER_LABEL[e.tier] ?? e.tier, e.points, e.spend, e.spend12mo, e.txCount, e.stringCount, d(e.joinedAt), d(e.lastTx), e.coachCode, e.referredBy].map(cell).join(","),
  );
  return new Response("﻿" + [head.map(cell).join(","), ...body].join("\r\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="member-tirtonic-${d(new Date())}.csv"` },
  });
}
