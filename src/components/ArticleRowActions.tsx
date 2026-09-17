"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteArticle } from "@/app/dasbord/actions";

export default function ArticleRowActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const remove = () => {
    if (!confirm("Hapus artikel ini?")) return;
    start(async () => {
      await deleteArticle(id);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/dasbord/article/${id}`}
        className="rounded-md border px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:border-primary hover:text-primary"
      >
        Edit
      </Link>
      <button
        onClick={remove}
        disabled={pending}
        className="rounded-md border px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:border-red-400 hover:text-red-600 disabled:opacity-50"
      >
        Hapus
      </button>
    </div>
  );
}
