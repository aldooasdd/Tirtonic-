import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Gambar undangan IG Story (1080×1920) buat dibagikan komunitas.
// ?demo=1 → pakai data contoh (buat pratinjau tanpa event nyata).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const origin = req.nextUrl.origin;
  const demo = req.nextUrl.searchParams.get("demo") === "1";

  let e: {
    brand: string; title: string; community: string; court: string;
    dateText: string; timeText: string; banner: string | null;
  } | null = null;

  if (!demo) {
    const claim = await prisma.demoClaim.findFirst({
      where: { id: params.id, status: "accepted" },
      include: { campaign: { select: { brand: true, title: true, banner: true } }, community: { select: { name: true } } },
    }).catch(() => null);
    if (claim) {
      e = {
        brand: claim.campaign.brand,
        title: claim.campaign.title,
        community: claim.community.name,
        court: claim.court,
        dateText: new Date(claim.demoDate).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
        timeText: claim.time ? `${claim.time}${claim.timeEnd ? `–${claim.timeEnd}` : ""} WIB` : "",
        banner: claim.campaign.banner,
      };
    }
  }
  if (!e) {
    e = { brand: "WILSON", title: "Demo Raket Wilson Blade 2026", community: "Komunitas Tenis Jogja", court: "Lapangan Tenis Lembah UGM", dateText: "Sabtu, 18 Oktober 2026", timeText: "08:00–10:00 WIB", banner: null };
  }

  const court3 = e.court.split(/\s+/).filter(Boolean).slice(0, 4).join(" ");
  const joinUrl = `${origin}/event/${params.id}`;
  const qr = await QRCode.toDataURL(joinUrl, { margin: 1, width: 320, color: { dark: "#0e5540", light: "#ffffff" } });

  const GREEN = "#146b52";
  const DARK = "#0b3f30";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: `linear-gradient(160deg, ${GREEN} 0%, ${DARK} 100%)`, color: "#fff", padding: "90px 80px", fontFamily: "sans-serif" }}>
        {/* Eyebrow */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 700, letterSpacing: 4, color: "#9fe3c9" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#9fe3c9", display: "flex" }} />
          TIRTONIC × KOMUNITAS
        </div>

        <div style={{ display: "flex", fontSize: 40, fontWeight: 600, marginTop: 70, color: "rgba(255,255,255,0.85)" }}>Kamu diundang ke</div>
        <div style={{ display: "flex", fontSize: 92, fontWeight: 800, lineHeight: 1.05, marginTop: 10 }}>Demo Produk {e.brand}</div>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 500, marginTop: 24, color: "rgba(255,255,255,0.8)" }}>{e.title}</div>

        {/* Banner / placeholder */}
        <div style={{ display: "flex", marginTop: 56, width: "100%", height: 460, borderRadius: 36, overflow: "hidden", background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.15)" }}>
          {e.banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img loading="lazy" decoding="async" src={e.banner} width={920} height={460} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
          ) : (
            <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", fontSize: 120, fontWeight: 800, color: "rgba(255,255,255,0.25)" }}>{e.brand}</div>
          )}
        </div>

        {/* Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 56, fontSize: 40 }}>
          <div style={{ display: "flex", gap: 18 }}><span>🏸</span><span style={{ fontWeight: 700 }}>{e.community}</span></div>
          <div style={{ display: "flex", gap: 18, color: "rgba(255,255,255,0.9)" }}><span>📅</span><span>{e.dateText}</span></div>
          {e.timeText ? <div style={{ display: "flex", gap: 18, color: "rgba(255,255,255,0.9)" }}><span>🕒</span><span>{e.timeText}</span></div> : <div style={{ display: "flex" }} />}
          <div style={{ display: "flex", gap: 18, color: "rgba(255,255,255,0.9)" }}><span>📍</span><span>{court3}</span></div>
        </div>

        {/* QR + CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: 36, marginTop: "auto", background: "rgba(255,255,255,0.1)", borderRadius: 32, padding: 32 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" decoding="async" src={qr} width={200} height={200} style={{ borderRadius: 20, background: "#fff", padding: 12 }} alt="" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 800 }}>Scan buat gabung</div>
            <div style={{ display: "flex", fontSize: 34, marginTop: 8, color: "#9fe3c9" }}>tirtonic.com/event</div>
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920 },
  );
}
