"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteSponsorship } from "@/app/dashboard/actions";

export default function SponsorshipDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const remove = () => {
    if (!confirm("Hapus pengajuan ini? Tidak bisa dibatalkan.")) return;
    start(async () => {
      await deleteSponsorship(id);
      router.refresh();
    });
  };

  return (
    <button
      onClick={remove}
      disabled={pending}
      className="shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium text-gray-500 transition hover:border-red-400 hover:text-red-600 disabled:opacity-50"
    >
      {pending ? "..." : "Hapus"}
    </button>
  );
}
