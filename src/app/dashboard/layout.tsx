import { isAuthed, currentRole, can } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import DashShell, { type NavGroup, type NavItem } from "@/components/dashboard/DashShell";
import { logout } from "./actions";

// Shell semua halaman /dashboard. Belum login (halaman login) → tanpa shell.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!isAuthed()) return <>{children}</>;
  const role = currentRole();
  const toShip = can("pesanan") ? await safeQuery(() => prisma.order.count({ where: { status: "PAID" } }), 0) : 0;

  const pick = (items: (NavItem | false)[]) => items.filter(Boolean) as NavItem[];
  const hasHome = (["produk", "kupon", "artikel", "hero", "store", "brand", "sponsor"] as const).some((x) => can(x));
  const groups: NavGroup[] = [
    { label: "Toko", items: pick([
      hasHome && { href: "/dashboard", label: "Dashboard", icon: "grid" },
      can("produk") && { href: "/dashboard#produk", label: "Produk", icon: "box" },
      can("pesanan") && { href: "/dashboard/orders", label: "Pesanan", icon: "bag", badge: toShip },
      can("pesanan") && { href: "/dashboard/preorder", label: "Pre-Order", icon: "clock" },
      can("produk") && { href: "/dashboard/promo", label: "Promo / Diskon", icon: "tag" },
      can("kupon") && { href: "/dashboard#kupon", label: "Kupon", icon: "ticket" },
    ]) },
    { label: "Layanan", items: pick([
      can("stringing") && { href: "/dashboard/stringing", label: "Stringing", icon: "racket" },
      (can("stringing") || can("event")) && { href: "/dashboard/stringing/reward", label: "Scan QR", icon: "scan" },
      can("event") && { href: "/dashboard/event", label: "Event Demo", icon: "calendar" },
      can("member") && { href: "/dashboard/member", label: "Member & Coach", icon: "users" },
    ]) },
    { label: "Konten", items: pick([
      can("artikel") && { href: "/dashboard#artikel", label: "Artikel", icon: "file" },
      can("hero") && { href: "/dashboard#hero", label: "Hero Banner", icon: "image" },
      can("store") && { href: "/dashboard#store", label: "Cabang", icon: "store" },
      can("brand") && { href: "/dashboard#brand", label: "Brand Popular", icon: "star" },
      can("sponsor") && { href: "/dashboard#sponsor", label: "Sponsorship", icon: "handshake" },
    ]) },
    { label: "Analitik", items: pick([can("trafik") && { href: "/dashboard/trafik", label: "Trafik", icon: "chart" }]) },
  ].filter((g) => g.items.length);

  return (
    <DashShell groups={groups} role={role?.label ?? "Admin"} logout={logout}>
      {children}
    </DashShell>
  );
}
