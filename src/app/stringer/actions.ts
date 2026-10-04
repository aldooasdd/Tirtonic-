"use server";

import { redirect } from "next/navigation";
import { checkStringerPassword, createStringerSession, destroyStringerSession } from "@/lib/stringer-auth";

export async function stringerLogin(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const pw = String(formData.get("password") ?? "");
  if (!checkStringerPassword(pw)) return { error: "Password salah." };
  createStringerSession();
  redirect("/stringer");
}

export async function stringerLogout() {
  destroyStringerSession();
  redirect("/stringer");
}
