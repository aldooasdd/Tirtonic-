import "server-only";
import { prisma } from "../prisma";
import type { Scope } from "./auth";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;

export async function tooManyLoginFails(ip: string, scope: Scope): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const fails = await prisma.sfLoginAttempt.count({ where: { ip, scope, success: false, createdAt: { gte: since } } });
  return fails >= MAX_FAILS;
}

export async function recordLogin(ip: string, scope: Scope, success: boolean): Promise<void> {
  await prisma.sfLoginAttempt.create({ data: { ip, scope, success } });
}
