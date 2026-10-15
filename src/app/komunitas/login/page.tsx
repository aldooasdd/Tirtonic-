import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentCommunityId } from "@/lib/community-auth";
import CommunityLoginForm from "@/components/CommunityLoginForm";
import EventTopBar from "@/components/EventTopBar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Login Komunitas — Tirtonic", robots: { index: false } };

export default function LoginKomunitas() {
  if (currentCommunityId()) redirect("/komunitas");
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <EventTopBar right={<Link href="/komunitas" className="text-sm font-medium text-gray-500 transition hover:text-primary">Kembali</Link>} />
      <main className="mx-auto max-w-md px-5 py-10 sm:px-8">
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-3xl">Login komunitas</h1>
        <p className="mt-2 text-sm text-gray-500 sm:text-base">Masuk untuk klaim demo &amp; kelola acaramu.</p>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:p-6">
          <CommunityLoginForm />
        </div>
        <p className="mt-4 text-center text-sm text-gray-500">
          Belum punya akun?{" "}
          <Link href="/komunitas/daftar" className="font-bold text-primary">Daftar di sini</Link>
        </p>
      </main>
    </div>
  );
}
