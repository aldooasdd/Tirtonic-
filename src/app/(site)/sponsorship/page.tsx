import SponsorshipForm from "./SponsorshipForm";
import Footer from "@/components/Footer";

export const metadata = { title: "Sponsorship — Tirtonic Tennis Store" };

export default function SponsorshipPage() {
  return (
    <>
      <div className="relative bg-gradient-to-br from-primaryDark to-primary py-20 text-center text-white">
        <h1 className="text-5xl font-black">Sponsorship</h1>
      </div>

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-sm leading-relaxed text-gray-700">
        <p>
          Sebagai bentuk komitmen kami dalam mendukung perkembangan dunia tenis di Indonesia,{" "}
          <strong className="text-primary">Tirtonic Tennis Store</strong> dengan bangga membuka kesempatan
          sponsorship bagi berbagai kegiatan dan event tenis. Kami percaya bahwa olahraga tenis tidak hanya
          sekadar pertandingan, tetapi juga wadah pembinaan karakter, disiplin, dan sportivitas.
        </p>
        <p>
          Melalui program sponsorship ini, kami ingin menjadi bagian dari perjalanan atlet-atlet muda, klub,
          maupun komunitas tenis dalam menciptakan prestasi dan memperluas jangkauan olahraga ini ke seluruh
          lapisan masyarakat. Dukungan sponsorship dari Tirtonic bisa berupa perlengkapan tenis (raket, bola,
          apparel), hadiah turnamen, hingga promosi dan publikasi event.
        </p>
        <p>
          Kami terbuka untuk berkolaborasi dengan event organizer, sekolah, kampus, komunitas, maupun federasi
          tenis dalam menciptakan event yang berdampak positif. Dengan semangat{" "}
          <strong className="text-primary">&ldquo;Customer service is at the core of our business&rdquo;</strong>,
          Tirtonic Tennis Store hadir bukan hanya sebagai toko, tapi sebagai mitra yang tumbuh bersama ekosistem
          tenis di Indonesia.
        </p>
        <p>Mari bersama membangun masa depan tenis Indonesia yang lebih baik!</p>
      </div>

      <div className="px-4 pb-10">
        <SponsorshipForm />
      </div>

      <div className="pb-10 text-center">
        <p className="text-lg font-bold text-gray-900">
          Need assistance? <a href="/contact" className="underline">Contact us.</a>
        </p>
      </div>
      <Footer />
    </>
  );
}
