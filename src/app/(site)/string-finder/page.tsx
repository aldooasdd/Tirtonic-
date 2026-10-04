import type { Metadata } from "next";
import questionsJson from "@/lib/string-finder/questions.json";
import StringFinderFlow, { type Question } from "@/components/StringFinderFlow";

export const metadata: Metadata = {
  title: "String Finder — Rekomendasi Senar Tenis | Tirtonic",
  description:
    "Jawab beberapa pertanyaan singkat, dapat 3 rekomendasi senar tenis yang pas — berdasarkan data lab Tennis Warehouse University yang disesuaikan untuk kebutuhan mainmu.",
};

export const dynamic = "force-dynamic";

export default function StringFinderPage() {
  const questions = (questionsJson as { questions: Question[] }).questions;
  return <StringFinderFlow questions={questions} />;
}
