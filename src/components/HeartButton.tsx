"use client";

import { useFav, FavItem } from "./CartProvider";

export default function HeartButton({ product }: { product: FavItem }) {
  const { has, toggle } = useFav();
  const fav = has(product.id);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(product);
      }}
      aria-label="Favorit"
      className={`absolute right-1.5 top-1.5 transition ${fav ? "text-red-500" : "text-gray-500 hover:text-red-500"}`}
    >
      <svg width="21" height="21" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </button>
  );
}
