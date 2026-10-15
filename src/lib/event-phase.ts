// Fase acara demo dari status klaim + tanggal. Dipakai di landing, dashboard komunitas, admin.
export type Phase = "pending" | "rejected" | "coming_soon" | "ongoing" | "done";

export function phaseOf(claim: { status: string; demoDate: Date | string }, now: Date = new Date()): Phase {
  if (claim.status === "pending") return "pending";
  if (claim.status === "rejected") return "rejected";
  // accepted → turunkan dari tanggal (demo dianggap berlangsung 1 hari penuh)
  const d = new Date(claim.demoDate);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  if (now < start) return "coming_soon";
  if (now < end) return "ongoing";
  return "done";
}

// Label + warna (warna + teks, tak hanya warna — aksesibilitas).
export const PHASE_META: Record<Phase, { label: string; chip: string; dot: string }> = {
  pending: { label: "Menunggu", chip: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  rejected: { label: "Ditolak", chip: "bg-red-100 text-red-600", dot: "bg-red-500" },
  coming_soon: { label: "Coming soon", chip: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  ongoing: { label: "On going", chip: "bg-green-100 text-green-700", dot: "bg-green-500" },
  done: { label: "Selesai", chip: "bg-gray-100 text-gray-500", dot: "bg-gray-400" },
};
