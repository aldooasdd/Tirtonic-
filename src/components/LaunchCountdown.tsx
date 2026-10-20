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
        size="md"
        onComplete={() => setDone(true)}
        completionMessage=""
      />
    </div>
  );
}
