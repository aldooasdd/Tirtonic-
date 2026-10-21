import { redirect } from "next/navigation";

// Dashboard pesanan digabung ke /riwayat/[phone] (tab Pesanan). Link WA lama tetap jalan.
export default function PesananSayaRedirect({ params }: { params: { phone: string } }) {
  redirect(`/riwayat/${params.phone}?tab=pesanan`);
}
