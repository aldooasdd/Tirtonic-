import "server-only";

// Bagian-bagian dashboard yang bisa dibatasi per role.
export const SECTIONS = ["produk", "kupon", "artikel", "hero", "store", "sponsor", "pesanan", "stringing", "trafik"] as const;
export type Section = (typeof SECTIONS)[number];

// password = default kalau env ROLE_<KEY>_PASSWORD tidak di-set.
export type Role = { key: string; label: string; sections: readonly Section[] | "all"; password?: string };

// Daftar role. Nambah jabatan baru = tambah satu baris di sini. "all" = akses
// semua bagian. Ganti/amankan password lewat env ROLE_<KEY>_PASSWORD di Vercel.
export const ROLES: Record<string, Role> = {
  bos: { key: "bos", label: "Bos", sections: "all" },
  admin: { key: "admin", label: "Admin", sections: ["produk", "kupon", "pesanan", "stringing"], password: "admin123" },
  marketing: { key: "marketing", label: "Marketing", sections: ["trafik", "artikel", "hero", "store", "sponsor"], password: "marketing123" },
  stringer: { key: "stringer", label: "Stringer", sections: ["stringing"], password: "stringer123" },
};

// Password per role: env ROLE_<KEY>_PASSWORD → default di config → (bos) ADMIN_PASSWORD.
export function rolePassword(key: string): string {
  const env = process.env[`ROLE_${key.toUpperCase()}_PASSWORD`] || "";
  if (env) return env;
  const def = ROLES[key]?.password || "";
  if (def) return def;
  if (key === "bos") return process.env.ADMIN_PASSWORD || "";
  return "";
}

export function roleCan(role: Role | null, section: Section): boolean {
  if (!role) return false;
  return role.sections === "all" || role.sections.includes(section);
}
