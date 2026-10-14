"use server";

import { redirect } from "next/navigation";
import { createStringerSession, destroyStringerSession } from "@/lib/stringer-auth";
import { branchByAccessCode, setBranchCookie, clearBranchCookie } from "@/lib/string-finder/session";

export async function stringerLogin(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const code = String(formData.get("code") ?? "").trim();
  const branch = await branchByAccessCode(code);
  if (!branch) return { error: "Kode cabang salah." };
  createStringerSession();
  setBranchCookie(branch.slug);
  redirect("/stringer");
}

export async function stringerLogout() {
  destroyStringerSession();
  clearBranchCookie();
  redirect("/stringer");
}
