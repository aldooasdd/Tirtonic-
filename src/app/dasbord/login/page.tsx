import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Login — Tirtonic" };

export default function LoginPage() {
  if (isAuthed()) redirect("/dasbord");
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-white p-8 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Tirtonic" className="mx-auto mb-3 h-12 w-12" />
        <h1 className="mb-1 text-center text-2xl font-extrabold text-primary">Admin Tirtonic</h1>
        <p className="mb-6 text-center text-sm text-gray-500">Masuk untuk kelola stok produk</p>
        <LoginForm />
      </div>
    </div>
  );
}
