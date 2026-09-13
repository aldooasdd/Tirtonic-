"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import { setStatus, deleteProduct } from "@/app/admin/actions";

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
        className={`rounded-full px-3 py-1 text-xs font-semibold text-white disabled:opacity-50 ${
          sold ? "bg-red-500" : "bg-primary"
        }`}
        title="Klik untuk ganti status"
      >
        {sold ? "Sold" : "Ready"} ⇄
      </button>
      <Link href={`/admin/product/${id}`} className="text-xs text-blue-600 hover:underline">
        Edit
      </Link>
      <button onClick={remove} disabled={pending} className="text-xs text-red-600 hover:underline disabled:opacity-50">
        Hapus
      </button>
    </div>
  );
}
