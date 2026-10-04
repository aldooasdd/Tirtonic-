import type { Metadata } from "next";
import questionsJson from "@/lib/string-finder/questions.json";
import StringFinderFlow, { type Question } from "@/components/StringFinderFlow";
import StringerLogin from "@/components/StringerLogin";
import { isStringer } from "@/lib/stringer-auth";
import { stringerLogout } from "./actions";

export const metadata: Metadata = { title: "Stringer — String Finder | Tirtonic", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function StringerPage() {
  if (!isStringer()) return <StringerLogin />;

  const questions = (questionsJson as { questions: Question[] }).questions;
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-7 w-7" />
          <span className="text-sm font-bold text-gray-900">Stringer Tirtonic</span>
        </div>
        <form action={stringerLogout}>
          <button className="text-xs font-semibold text-gray-400 hover:text-gray-700">Keluar</button>
        </form>
      </header>
      <StringFinderFlow questions={questions} />
    </div>
  );
}
