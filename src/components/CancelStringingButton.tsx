"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cancelStringing } from "@/app/dashboard/stringing/actions";

export default function CancelStringingButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const cancel = () => {
    if (!confirm("Batalkan pesanan ini? Pesanan akan dihapus dari antrian.")) return;
    start(async () => {
      await cancelStringing(id);
      router.refresh();
    });
  };

  return (
    <button
      onClick={cancel}
      disabled={pending}
      className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "..." : "Batal"}
    </button>
  );
}
