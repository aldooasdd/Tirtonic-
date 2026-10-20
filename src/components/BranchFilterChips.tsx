"use client";

import { useState } from "react";

// Filter cabang di dashboard stringing: klik cabang → cuma section cabang itu yang tampil.
// Toggle visibility lewat atribut data-branch-section (section dirender server).
export default function BranchFilterChips({ branches }: { branches: { id: string; name: string }[] }) {
  const [sel, setSel] = useState<string>("all");
  if (branches.length <= 1) return null;

  function pick(id: string) {
    setSel(id);
    if (typeof document === "undefined") return;
    document.querySelectorAll<HTMLElement>("[data-branch-section]").forEach((el) => {
      el.classList.toggle("hidden", id !== "all" && el.getAttribute("data-branch-section") !== id);
    });
  }

  const chip = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${active ? "border-primary bg-primary text-white" : "border-gray-300 text-gray-600 hover:border-primary hover:text-primary"}`;

  return (
    <div className="mb-5 flex flex-wrap gap-2">
      <button type="button" onClick={() => pick("all")} className={chip(sel === "all")}>Semua</button>
      {branches.map((b) => (
        <button type="button" key={b.id} onClick={() => pick(b.id)} className={chip(sel === b.id)}>{b.name}</button>
      ))}
    </div>
  );
}
