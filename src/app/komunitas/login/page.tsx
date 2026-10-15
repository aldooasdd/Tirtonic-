import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentCommunityId } from "@/lib/community-auth";
import CommunityLoginForm from "@/components/CommunityLoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Login Komunitas — Tirtonic", robots: { index: false } };

export default function LoginKomunitas() {
  if (currentCommunityId()) redirect("/komunitas");
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <header className="rounded-b-[1.5rem] bg-gradient-to-br from-primaryDark to-primary text-white sm:rounded-b-[2rem]">
        <div className="mx-auto max-w-md px-5 pb-10 pt-10 sm:px-8">
          <Link href="/komunitas" className="mb-5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
          <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">Login komunitas</h1>
          <p className="mt-2 text-sm text-white/80 sm:text-base">Masuk untuk klaim demo &amp; kelola acaramu.</p>
        </div>
      </header>

      <div className="mx-auto -mt-6 max-w-md px-4 sm:px-8">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:p-6">
          <CommunityLoginForm />
        </div>
        <p className="mt-4 text-center text-sm text-gray-500">
          Belum punya akun?{" "}
          <Link href="/komunitas/daftar" className="font-bold text-primary">Daftar di sini</Link>
        </p>
      </div>
    </div>
  );
}
