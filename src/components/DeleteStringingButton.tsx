"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteStringingOrder } from "@/app/dashboard/stringing/actions";

export default function DeleteStringingButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const remove = () => {
    if (!confirm("Hapus data ini dari riwayat? Tidak bisa dibatalkan.")) return;
    start(async () => {
      await deleteStringingOrder(id);
      router.refresh();
    });
  };

  return (
    <button
      onClick={remove}
      disabled={pending}
      className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "..." : "Hapus"}
    </button>
  );
}
