import { NextRequest } from "next/server";
import { isAuthed, can } from "@/lib/auth";

// Unduh foto kegiatan demo dari hub sebagai lampiran (link lintas-domain tak bisa pakai atribut download).
export async function GET(req: NextRequest) {
  if (!isAuthed() || (!can("event") && !can("stringing"))) return new Response("Unauthorized", { status: 401 });
  const u = req.nextUrl.searchParams.get("u") ?? "";
  const name = (req.nextUrl.searchParams.get("name") ?? "foto-demo").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
  const hub = process.env.TIRTONICHUB_POINTS_URL;
  // hanya foto di hub sendiri (cegah dipakai jadi proxy ke URL lain)
  if (!hub || !u.startsWith(`${new URL(hub).origin}/api/file?key=`)) return new Response("Bad url", { status: 400 });
  const r = await fetch(u, { cache: "no-store", signal: AbortSignal.timeout(20000) }).catch(() => null);
  if (!r?.ok) return new Response("Foto tidak bisa diambil dari server hub.", { status: 502 });
  return new Response(r.body, {
    headers: { "Content-Type": r.headers.get("content-type") ?? "image/jpeg", "Content-Disposition": `attachment; filename="${name}.jpg"` },
  });
}
