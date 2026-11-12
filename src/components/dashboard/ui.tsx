// Komponen dasar dashboard admin (gaya kartu putih, garis tipis, ikon garis).
const PATHS: Record<string, string> = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
  box: "M21 8l-9-5-9 5v8l9 5 9-5z M3 8l9 5 9-5 M12 13v8",
  bag: "M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2",
  tag: "M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z M7 7h.01",
  ticket: "M3 9a3 3 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a3 3 0 0 1 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z M13 5v2 M13 17v2 M13 11v2",
  racket: "M14.5 3c3.6 0 6.5 2.4 6.5 5.6 0 3.9-3.6 7.4-7.5 7.4C10.2 16 8 13.6 8 10.5 8 6.6 11 3 14.5 3z M10 15l-6.5 6.5 M2.5 20.5l1 1 M11 7.5l7 7 M9.5 11l5 5 M14 5l-4.5 4.5 M18 6.5l-6.5 6.5",
  queue: "M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M10 11h6 M10 16h6 M7.5 11h.01 M7.5 16h.01",
  scan: "M3 7V5a2 2 0 0 1 2-2h2 M17 3h2a2 2 0 0 1 2 2v2 M21 17v2a2 2 0 0 1-2 2h-2 M7 21H5a2 2 0 0 1-2-2v-2 M7 12h10",
  calendar: "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h8",
  image: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M21 15l-5-5L5 21 M9 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  store: "M3 9l1.5-5h15L21 9 M3 9v11h18V9 M3 9h18 M9 20v-6h6v6",
  star: "M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z",
  handshake: "M11 17l2 2a1 1 0 0 0 3-3 M14 14l2.5 2.5a1 1 0 0 0 3-3l-3.9-3.9a3 3 0 0 0-4.2 0l-.9.9a1 1 0 0 1-3-3l2.8-2.8a6 6 0 0 1 7.4-.9l.5.3a2 2 0 0 0 1.4.3L21 4 M21 3l1 11h-2 M3 3L2 14l6.5 6.5a1 1 0 0 0 3-3 M3 4h8",
  chart: "M3 3v18h18 M7 16v-4 M12 16V8 M17 16v-7",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  key: "M15.5 7.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z M12 11v10 M12 15h3 M12 18h2",
  external: "M15 3h6v6 M10 14L21 3 M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  x: "M18 6L6 18 M6 6l12 12",
  truck: "M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2 M15 18H9 M19 18h2a1 1 0 0 0 1-1v-3.7a1 1 0 0 0-.2-.6l-3.5-4.3A1 1 0 0 0 17.5 8H14 M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  wallet: "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1 M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",
  check: "M22 11.1V12a10 10 0 1 1-5.9-9.1 M22 4L12 14l-3-3",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
};
export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}

export const card = "rounded-2xl border border-[#E6EAE8] bg-white shadow-[0_1px_3px_rgba(15,31,26,0.04)]";

export function PageHeader({ title, desc, children }: { title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F1F1A]">{title}</h1>
        {desc && <p className="mt-1 text-sm text-[#6B7A74]">{desc}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

const TONE = { ink: "text-[#0F1F1A]", green: "text-primary", red: "text-red-600", blue: "text-blue-700", amber: "text-amber-600" };

export function StatCard({ icon, label, value, tone = "ink", note }: { icon: IconName; label: string; value: React.ReactNode; tone?: keyof typeof TONE; note?: string }) {
  return (
    <div className={`${card} p-4`}>
      <div className="flex items-center gap-2.5 border-b border-[#EEF1EF] pb-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#E6EAE8] text-[#0F1F1A]">
          <Icon name={icon} />
        </span>
        <span className="text-sm font-medium text-[#0F1F1A]">{label}</span>
      </div>
      <div className={`mt-3 text-[28px] font-semibold leading-none ${TONE[tone]}`}>{value}</div>
      {note && <div className="mt-2 text-[11px] text-[#9AA6A1]">{note}</div>}
    </div>
  );
}

export const btn = "inline-flex items-center gap-2 rounded-xl border border-[#E6EAE8] bg-white px-3.5 py-2 text-sm font-medium text-[#0F1F1A] transition hover:border-primary hover:text-primary";
export const btnPrimary = "inline-flex items-center gap-2 rounded-xl bg-[#0E3B2E] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-primary";
