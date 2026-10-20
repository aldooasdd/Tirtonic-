"use client";

import { useEffect, useState } from "react";
import { AnimatedCountdown } from "@/components/ui/animated-countdown";

// Countdown ke tanggal hari-H launching. Hilang kalau sudah lewat / tanpa tanggal.
export default function LaunchCountdown({ date }: { date: string | null }) {
  const target = date ? new Date(date).getTime() : 0;
  const [mounted, setMounted] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!target || !mounted || done || target - Date.now() <= 0) return null;
  return (
    <div className="mb-3">
      <AnimatedCountdown
        targetDate={new Date(target)}
        variant="minimal"
        size="sm"
        containerClassName="!p-0 gap-2"
        unitClassName="min-w-[3.3rem] rounded-xl border border-white/60 bg-white/55 px-2.5 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.08)] backdrop-blur-md sm:min-w-[4rem]"
        numberClassName="text-xl sm:text-2xl"
        labelClassName="text-[9px] tracking-[0.12em]"
        onComplete={() => setDone(true)}
        completionMessage=""
      />
    </div>
  );
}
