"use client";

import { useRouter } from "next/navigation";

const OPTS = [
  { v: "global", label: "Global — semua lokasi" },
  { v: "jogja", label: "Tirtonic Jogja" },
  { v: "solo", label: "Tirtonic Solo" },
  { v: "semarang", label: "Tirtonic Semarang" },
];

export default function LeaderboardLocation({ value }: { value: string }) {
  const router = useRouter();
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={(e) => router.push(e.target.value === "global" ? "/leaderboard" : `/leaderboard?loc=${e.target.value}`)}
        className="appearance-none rounded-full bg-white/15 py-1.5 pl-4 pr-9 text-sm font-semibold text-white outline-none"
      >
        {OPTS.map((o) => (
          <option key={o.v} value={o.v} className="text-gray-900">{o.label}</option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-3 h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
    </div>
  );
}
