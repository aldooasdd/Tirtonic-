import { redirect } from "next/navigation";
import Link from "next/link";
import { isAuthed, currentRole } from "@/lib/auth";
import { logout } from "../actions";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ganti Kata Sandi — Tirtonic" };

// Semua role boleh ganti kata sandinya sendiri (tanpa batasan section).
export default function PasswordPage() {
  if (!isAuthed()) redirect("/dashboard/login");
  const role = currentRole();

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-primary">← Kembali</Link>
          <form action={logout}>
            <button className="rounded-full border px-4 py-1.5 text-sm font-semibold text-gray-600 transition hover:border-red-400 hover:text-red-600">Logout</button>
          </form>
        </div>
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-extrabold text-gray-900">Ganti Kata Sandi</h1>
          <p className="mb-5 mt-1 text-sm text-gray-500">Role: <span className="font-semibold text-primary">{role?.label ?? "—"}</span>. Perubahan hanya berlaku untuk akun role ini.</p>
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
