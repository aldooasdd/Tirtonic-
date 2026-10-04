import "server-only";
import { prisma } from "../prisma";

export const JOB_EXPIRY_MS = 30 * 60 * 1000; // job antri > 30 menit -> kedaluwarsa
const RL_WINDOW_MS = 10 * 60 * 1000;
const RL_MAX = 10; // 10 job / 10 menit / cabang

/** Tandai job antri yang lebih tua dari 30 menit sebagai kedaluwarsa (dipanggil saat polling/cek status). */
export async function expireStaleJobs(branchId?: string): Promise<void> {
  const cutoff = new Date(Date.now() - JOB_EXPIRY_MS);
  await prisma.sfPrintJob.updateMany({
    where: { status: "antri", createdAt: { lt: cutoff }, ...(branchId ? { branchId } : {}) },
    data: { status: "kedaluwarsa" },
  });
}

/** True bila cabang sudah membuat >= 10 job dalam 10 menit terakhir. */
export async function tooManyJobs(branchId: string): Promise<boolean> {
  const since = new Date(Date.now() - RL_WINDOW_MS);
  const n = await prisma.sfPrintJob.count({ where: { branchId, createdAt: { gte: since } } });
  return n >= RL_MAX;
}
