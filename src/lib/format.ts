export function rupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

// ponytail: nomor admin 1 di-hardcode langsung. Env NEXT_PUBLIC_ADMIN_WA sengaja
// tidak dipakai lagi supaya nomor live tidak bergantung pada setting Vercel.
const WA = "6285163215511";

export function waOrderLink(namaProduk: string): string {
  const text = `Halo Admin Tirtonic, saya mau pesan produk: ${namaProduk}. Apakah masih ready?`;
  return `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
}

export function waLink(text: string): string {
  return `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
}
