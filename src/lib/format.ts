export function rupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

const WA = process.env.NEXT_PUBLIC_ADMIN_WA || "6281312576998";

export function waOrderLink(namaProduk: string): string {
  const text = `Halo Admin Tirtonic, saya mau pesan produk: ${namaProduk}. Apakah masih ready?`;
  return `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
}

export function waLink(text: string): string {
  return `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
}
