import { redirect } from "next/navigation";

// Dashboard pesanan digabung ke /user/[phone] (tab Pesanan). Link WA lama tetap jalan.
export default function PesananSayaRedirect({ params }: { params: { phone: string } }) {
  redirect(`/user/${params.phone}?tab=pesanan`);
}
