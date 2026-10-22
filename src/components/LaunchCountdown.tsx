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
        containerClassName="!p-0 [&>div]:!flex [&>div]:!flex-nowrap [&>div]:gap-1.5"
        unitClassName="min-w-[2rem] flex-1 rounded-md border-0 bg-white/10 px-1 py-1 backdrop-blur-md shadow-[inset_3px_3px_0.5px_-3px_rgba(255,255,255,0.6),inset_-3px_-3px_0.5px_-3px_rgba(255,255,255,0.5),inset_0_0_6px_6px_rgba(255,255,255,0.12),0_0_12px_rgba(0,0,0,0.15)] sm:min-w-[2.4rem]"
        numberClassName="text-xs sm:text-sm"
        labelClassName="text-[7px] tracking-[0.08em]"
        onComplete={() => setDone(true)}
        completionMessage=""
      />
    </div>
  );
}
