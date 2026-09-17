// Server-only: notify the shop of a new sponsorship submission via Resend's REST API.
// No-op when RESEND_API_KEY / SPONSOR_NOTIFY_EMAIL are unset (e.g. local dev), so the
// submission still saves even without email configured.
// ponytail: plain fetch, no SDK dependency. from=onboarding@resend.dev works without a
// verified domain as long as the recipient is your own Resend account email.

export type SponsorEmailInfo = {
  organisasi: string;
  penanggungJawab: string;
  noWa: string;
  email: string;
  namaEvent: string | null;
  jenisEvent: string[];
  tanggalEvent: string | null;
  alamatEvent: string | null;
  kota: string | null;
  ringkasan: string | null;
  bentuk: string[];
  eksposur: string | null;
  catatan: string | null;
  proposalFile: string | null;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function sendSponsorshipEmail(s: SponsorEmailInfo): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.SPONSOR_NOTIFY_EMAIL;
  if (!key || !to) return;

  const rows: [string, string | null][] = [
    ["Organisasi", s.organisasi],
    ["Penanggung jawab", s.penanggungJawab],
    ["No. WA", s.noWa],
    ["Email", s.email],
    ["Nama event", s.namaEvent],
    ["Jenis event", s.jenisEvent.join(", ") || null],
    ["Tanggal", s.tanggalEvent],
    ["Kota", s.kota],
    ["Alamat", s.alamatEvent],
    ["Bentuk sponsorship", s.bentuk.join(", ") || null],
    ["Eksposur", s.eksposur],
    ["Ringkasan", s.ringkasan],
    ["Catatan", s.catatan],
  ];
  const tableRows = rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:4px 0">${esc(v as string)}</td></tr>`
    )
    .join("");

  const html =
    `<div style="font-family:system-ui,sans-serif;font-size:14px;color:#111">` +
    `<h2 style="margin:0 0 12px">Pengajuan Sponsorship Baru</h2>` +
    `<table style="border-collapse:collapse">${tableRows}</table>` +
    (s.proposalFile
      ? `<p style="margin-top:16px"><a href="${s.proposalFile}" style="color:#0a7d3c">📎 Lihat / unduh proposal</a></p>`
      : "") +
    `</div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.SPONSOR_FROM_EMAIL || "Tirtonic Sponsorship <onboarding@resend.dev>",
      to: [to],
      reply_to: s.email,
      subject: `Sponsorship: ${s.organisasi}${s.namaEvent ? ` — ${s.namaEvent}` : ""}`,
      html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend gagal (HTTP ${res.status}): ${await res.text()}`);
  }
}
