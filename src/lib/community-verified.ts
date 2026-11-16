// Centang biru komunitas = profil lengkap. Nama, IG & WA wajib saat daftar, jadi syarat sisanya logo.
export const communityChecklist = (c: { name: string; instagram: string; waPhone?: string; logo: string | null }) => [
  { label: "Nama komunitas", ok: !!c.name.trim() },
  { label: "Username Instagram", ok: !!c.instagram },
  { label: "Nomor WhatsApp PIC", ok: c.waPhone === undefined || !!c.waPhone },
  { label: "Logo komunitas", ok: !!c.logo },
];
export const isVerifiedCommunity = (c: { logo: string | null }) => !!c.logo;
