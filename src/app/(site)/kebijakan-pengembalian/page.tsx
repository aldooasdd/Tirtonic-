import Link from "next/link";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Kebijakan Pengembalian — Tirtonic Tennis Store",
  description: "Pengembalian produk dalam 14 hari sejak pesanan diterima. Syarat, cara mengajukan, biaya, voucher, dan ketentuan per kategori.",
};

const WA_CR = "https://wa.me/6285111455113";

function Bagian({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-gray-900">{judul}</h2>
      {children}
    </section>
  );
}

const Daftar = ({ isi }: { isi: React.ReactNode[] }) => (
  <ul className="list-disc space-y-1.5 pl-5">
    {isi.map((x, i) => <li key={i}>{x}</li>)}
  </ul>
);

export default function KebijakanPengembalianPage() {
  return (
    <>
      <div className="bg-gradient-to-br from-primaryDark to-primary px-4 py-16 text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Tirtonic Tennis Store</p>
        <h1 className="mt-2 text-3xl font-black sm:text-5xl">Kebijakan Pengembalian Produk</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/80">Berlaku untuk pembelian di tirtonic.com dan toko Tirtonic Jogja, Solo, dan Semarang</p>
      </div>

      <div className="mx-auto max-w-3xl space-y-9 px-4 py-10 text-[15px] leading-relaxed text-gray-700">
        <p className="rounded-2xl bg-primary/5 p-5 text-gray-800">
          Kurang puas dengan produk yang Anda terima? Anda dapat mengembalikannya dalam <strong className="text-primary">14 hari</strong> sejak pesanan diterima.
        </p>

        <Bagian judul="Syarat Pengembalian">
          <Daftar isi={[
            "Produk dalam kondisi baru, label masih terpasang, dan berada dalam kemasan asli.",
            "Penukaran ukuran atau warna untuk pesanan online dilakukan dengan mengembalikan produk lama, lalu membeli produk pengganti. Dana pengembalian akan kami proses setelah produk diterima. Untuk pembelian langsung di toko, penukaran dapat dilakukan di cabang Tirtonic Jogja, Solo, atau Semarang selama stok tersedia.",
            "Kemas produk dengan aman dan tutup paket dengan rapat agar tidak rusak selama pengiriman.",
          ]} />
        </Bagian>

        <Bagian judul="Cara Mengajukan Pengembalian">
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>Masuk ke akun Anda di tirtonic.com, lalu buka <Link href="/pesanan-saya" className="font-semibold text-primary hover:underline">Pesanan Saya</Link>.</li>
            <li>Pilih pesanan dan produk yang ingin dikembalikan, lalu isi alasan pengembalian.</li>
            <li>Kirim produk ke alamat yang tertera, atau antar langsung ke toko Tirtonic terdekat.</li>
          </ol>
          <p>Anda juga dapat menghubungi tim Client Relations kami melalui <a href={WA_CR} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">WhatsApp</a> untuk bantuan.</p>
        </Bagian>

        <Bagian judul="Biaya Pengembalian">
          <Daftar isi={[
            "Jika terjadi kesalahan dari pihak Tirtonic, seperti produk, ukuran, atau warna yang dikirim tidak sesuai, atau produk cacat, seluruh ongkos kirim kami tanggung.",
            "Untuk alasan lain, ongkos kirim pengembalian ditanggung pembeli, dan ongkos kirim awal tidak dikembalikan.",
          ]} />
        </Bagian>

        <Bagian judul="Pilihan Voucher Belanja">
          <p>Selain pengembalian dana, Anda dapat memilih Voucher Belanja Tirtonic senilai harga produk. Voucher ini dapat langsung digunakan untuk membeli ukuran atau produk lain. Jika pesanan yang dibayar dengan voucher tersebut dikembalikan lagi, pengembaliannya hanya dapat diproses dalam bentuk voucher.</p>
        </Bagian>

        <Bagian judul="Pengembalian Dana">
          <p>Dana dikembalikan dalam 3–7 hari kerja setelah produk kami terima dan lolos pemeriksaan. Dana dikirim ke metode pembayaran awal. Untuk transfer bank, dana dikirim ke rekening atas nama pemesan. Waktu masuknya dana bergantung pada bank atau penyedia pembayaran.</p>
        </Bagian>

        <Bagian judul="Ketentuan per Kategori Produk">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Raket", ["Plastik pelindung pada grip masih utuh.", "Raket belum pernah digunakan, dan tidak ada goresan pada frame maupun senar.", "Raket yang sudah dipasang senar oleh tim stringing Tirtonic, atau dipesan dengan opsi pilihan senar dan tension, dianggap produk custom dan tidak dapat dikembalikan."]],
              ["Pakaian", ["Bersih, belum dicuci, tidak rusak, dan label asli masih terpasang."]],
              ["Sepatu", ["Dikembalikan bersama box aslinya.", "Kondisi baru dan bersih, tanpa tanda pemakaian. Sol tidak boleh kotor atau tergores."]],
              ["Produk Lain", ["Produk harus dalam kondisi layak jual kembali, dengan kemasan dan label asli."]],
            ].map(([k, isi]) => (
              <div key={k as string} className="rounded-2xl border p-5">
                <h3 className="mb-2 font-semibold text-gray-900">{k}</h3>
                <Daftar isi={isi as string[]} />
              </div>
            ))}
          </div>
        </Bagian>

        <Bagian judul="Produk yang Tidak Dapat Dikembalikan">
          <Daftar isi={[
            "Produk Pre-Order dan produk yang dibeli dalam program Final Sale / B1G1.",
            "Senar yang sudah dipotong atau dipasang, overgrip yang sudah dibuka, dan kaus kaki.",
            "Produk yang sudah dipersonalisasi.",
          ]} />
          <p className="rounded-2xl bg-gray-50 p-4 text-sm">Pengecualian di atas tidak berlaku untuk produk cacat atau salah kirim. Produk tersebut tetap dapat dikembalikan atau diganti sesuai ketentuan perlindungan konsumen.</p>
        </Bagian>
      </div>
      <Footer />
    </>
  );
}
