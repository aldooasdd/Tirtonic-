"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";

// Animated "TIRTONIC TENNIS STORE" logo. Fetched at runtime from /public so the
// 69KB JSON never bloats the shared JS bundle; only this page pays for it.
export default function LottieLogo() {
  const [data, setData] = useState<object | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/logo-animation.json")
      .then((r) => r.json())
      .then((d) => alive && setData(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // reserve height to avoid layout shift while the JSON loads
  return (
    <div className="mx-auto mb-6 flex min-h-[80px] w-full max-w-[200px] items-center justify-center">
      {data && <Lottie animationData={data} loop={false} className="w-full" />}
    </div>
  );
}
