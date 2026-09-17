"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import { setStatus, deleteProduct } from "@/app/dasbord/actions";

export default function ProductRowActions({
  id,
  status,
}: {
  id: string;
  status: "READY" | "SOLD";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const sold = status === "SOLD";

  const toggle = () =>
    start(async () => {
      await setStatus(id, sold ? "READY" : "SOLD");
      router.refresh();
    });

  const remove = () => {
    if (!confirm("Hapus produk ini?")) return;
    start(async () => {
      await deleteProduct(id);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        disabled={pending}
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white transition disabled:opacity-50 ${
          sold ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primaryDark"
        }`}
        title="Klik untuk ganti status"
      >
        {sold ? "Sold" : "Ready"} ⇄
      </button>
      <Link
        href={`/dasbord/product/${id}`}
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
