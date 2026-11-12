"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Item = { key: string; label: string };

/** Pill penanda yang meluncur halus ke item aktif. */
function useIndicator(active: string) {
  const wrap = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = wrap.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(active)}"]`);
      setBox(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    };
    measure();
    // ukur ulang saat font selesai dimuat / lebar berubah (lebar teks bergeser)
    document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [active]);
  return { wrap, box };
}

/** Menu navbar /event: klik → pill meluncur + scroll halus ke section; scroll manual → pill ikut section yang terlihat. */
export function EventNavLinks({ items }: { items: Item[] }) {
  const [active, setActive] = useState("");
  const lock = useRef(0);
  const { wrap, box } = useIndicator(active);

  useEffect(() => {
    const onScroll = () => {
      if (Date.now() < lock.current) return;
      let cur = "";
      for (const it of items) {
        const el = document.getElementById(it.key);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) cur = it.key;
      }
      setActive(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [items]);

  return (
    <div ref={wrap} className="relative flex items-center gap-1 text-xs font-[500]">
      <span
        aria-hidden
        className="absolute inset-y-0 rounded-full bg-neutral-900/[0.07] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ left: box?.left ?? 0, width: box?.width ?? 0, opacity: box ? 1 : 0 }}
      />
      {items.map((it) => (
        <a
          key={it.key}
          data-key={it.key}
          href={`#${it.key}`}
          onClick={(e) => {
            e.preventDefault();
            setActive(it.key);
            lock.current = Date.now() + 900; // jangan ditimpa scrollspy selama animasi scroll
            document.getElementById(it.key)?.scrollIntoView({ behavior: "smooth", block: "start" });
            history.replaceState(null, "", `#${it.key}`);
          }}
          className={`relative rounded-full px-3.5 py-1.5 outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-lime-400 ${active === it.key ? "text-neutral-950" : "text-neutral-600 hover:text-neutral-950"}`}
        >
          {it.label}
        </a>
      ))}
    </div>
  );
}

/** Tab kota: pill hitam meluncur ke kota terpilih, lalu ganti ?kota= tanpa lompat scroll. */
export function CityTabs({ cities, current }: { cities: string[]; current: string }) {
  const router = useRouter();
  const [active, setActive] = useState(current);
  useEffect(() => setActive(current), [current]);
  const { wrap, box } = useIndicator(active || "__all");
  const list = [{ key: "__all", label: "Semua Kota", city: "" }, ...cities.map((c) => ({ key: c, label: c, city: c }))];

  return (
    <div ref={wrap} className="relative flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-[500] [scrollbar-width:none] md:pb-0">
      <span
        aria-hidden
        className="absolute top-0 h-[calc(100%-4px)] rounded-full border border-white/20 bg-neutral-900 shadow-sm transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:h-full"
        style={{ left: box?.left ?? 0, width: box?.width ?? 0, opacity: box ? 1 : 0 }}
      />
      {list.map((it) => {
        const on = (active || "__all") === it.key;
        return (
          <button
            key={it.key}
            data-key={it.key}
            type="button"
            onClick={() => {
              setActive(it.city);
              router.push(it.city ? `/event?kota=${encodeURIComponent(it.city)}` : "/event", { scroll: false });
            }}
            className={`relative shrink-0 rounded-full border px-3.5 py-1.5 outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-lime-400 ${on ? "border-transparent font-[600] text-white" : "border-white/70 bg-white/60 text-neutral-700 shadow-sm hover:bg-white/90"}`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
