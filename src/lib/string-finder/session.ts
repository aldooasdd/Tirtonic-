import "server-only";
import { cookies } from "next/headers";
import { prisma } from "../prisma";
import { COOKIE, verifySession, type Scope } from "./auth";

export const BRANCH_COOKIE = "sf_branch";
export const STATION_BRANCH_COOKIE = "sf_station_branch";

/** Cari cabang dari kode login kiosk (jogja88/solo88/…). Null bila kode salah. */
export async function branchByAccessCode(code: string): Promise<{ slug: string; name: string } | null> {
  if (!code) return null;
  const b = await prisma.sfBranch.findFirst({
    where: { accessCode: code, isActive: true },
    select: { slug: true, name: true },
  });
  return b ?? null;
}

export function setBranchCookie(slug: string) {
  cookies().set(BRANCH_COOKIE, slug, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 hari (perangkat toko)
  });
}

export function clearBranchCookie() {
  cookies().delete(BRANCH_COOKIE);
}

/** Cabang stasiun cetak dari cookie perangkat stasiun. */
export async function getStationBranch(): Promise<{ id: string; name: string; slug: string; paperMm: string } | null> {
  const slug = cookies().get(STATION_BRANCH_COOKIE)?.value;
  if (!slug) return null;
  const b = await prisma.sfBranch.findFirst({
    where: { slug, isActive: true },
    select: { id: true, name: true, slug: true, paperMm: true },
  });
  return b ?? null;
}

export async function getScope(): Promise<Scope | null> {
  const s = await verifySession(cookies().get(COOKIE)?.value);
  return s?.scope ?? null;
}

/** Cabang perangkat dari cookie, divalidasi ke SfBranch aktif. Null bila belum/ tidak valid. */
export async function getActiveBranch(): Promise<{ id: string; name: string; slug: string; paperMm: string } | null> {
  const slug = cookies().get(BRANCH_COOKIE)?.value;
  if (!slug) return null;
  const b = await prisma.sfBranch.findFirst({
    where: { slug, isActive: true },
    select: { id: true, name: true, slug: true, paperMm: true },
  });
  return b ?? null;
}
