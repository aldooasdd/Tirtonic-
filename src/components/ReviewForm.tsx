"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { submitReview, type ReviewState } from "@/app/pesanan-saya/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primaryDark disabled:opacity-50">
      {pending ? "Mengirim…" : "Kirim Penilaian"}
    </button>
  );
}

// Form rating 1–5 bintang + komentar untuk satu produk di pesanan DELIVERED.
export default function ReviewForm({ orderId, phone, productNama }: { orderId: string; phone: string; productNama: string }) {
  const [state, action] = useFormState<ReviewState, FormData>(submitReview, {});
  const [rating, setRating] = useState(0);

  if (state.ok) return <p className="mt-1 text-xs font-semibold text-emerald-600">Terima kasih atas penilaianmu! ✓</p>;

  return (
    <form action={action} className="mt-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="phone" value={phone} />
      <input type="hidden" name="productNama" value={productNama} />
      <input type="hidden" name="rating" value={rating} />
      <p className="text-xs font-semibold text-gray-700">Nilai produk ini:</p>
      <div className="mt-1 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} bintang`} className="text-xl leading-none">
            <span className={n <= rating ? "text-amber-400" : "text-gray-300"}>★</span>
          </button>
        ))}
      </div>
      <textarea
        name="komentar"
        rows={2}
        maxLength={500}
        placeholder="Tulis ulasan (opsional)…"
        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none focus:border-primary"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        {state.error ? <p className="text-xs text-red-600">{state.error}</p> : <span />}
        <Submit />
      </div>
    </form>
  );
}
