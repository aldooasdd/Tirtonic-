// Sesi JWT (HS256, jose). Edge-safe (dipakai juga di middleware). Tanpa akses DB di sini.
import { SignJWT, jwtVerify } from "jose";

export type Scope = "app" | "admin" | "station";
export const COOKIE = "sf_session";

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET || "dev-insecure-secret");

export async function signSession(scope: Scope, days: number): Promise<string> {
  return new SignJWT({ scope })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<{ scope: Scope } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const scope = payload.scope;
    if (scope === "app" || scope === "admin" || scope === "station") return { scope };
    return null;
  } catch {
    return null;
  }
}

export const SESSION_DAYS: Record<Scope, number> = { app: 30, admin: 0.5, station: 30 }; // admin 12 jam
