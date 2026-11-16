import "server-only";
import { createHash } from "crypto";
import { unstable_cache } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";

// Deskripsi "Tentang Demo Day" per acara (1 sesi komunitas), dibuat AI dari data acara itu saja.
// Di-cache per isi fakta (berubah peserta/foto/fase → dibuat ulang). Tanpa ANTHROPIC_API_KEY / gagal → template.

export type EventFacts = {
  judulKampanye: string;
  brand: string;
  produk: string;
  infoProduk: string; // deskripsi kampanye dari toko (fakta produk)
  komunitas: string;
  kota: string | null;
  lapangan: string;
  hari: string; // "Sabtu, 14 November 2026"
  jam: string; // "15:00 – 18:00 WIB"
  fase: "akan datang" | "berlangsung hari ini" | "sudah selesai";
  kuota: number;
  pesertaDiterima: number;
  fotoKegiatan: number;
  voucher: string; // "Rp 50.000 khusus Yonex Raket Ezone ..."
};

export function templateDescription(f: EventFacts): string {
  const tempat = `${f.lapangan}${f.kota ? `, ${f.kota}` : ""}`;
  if (f.fase === "sudah selesai") {
    return `${f.komunitas} bersama Tirtonic Tennis Store menggelar demo ${f.brand} ${f.produk} pada ${f.hari} pukul ${f.jam} di ${tempat}.` +
      `${f.pesertaDiterima ? ` Sebanyak ${f.pesertaDiterima} pemain terdaftar ikut mencoba langsung di lapangan.` : ""}` +
      `${f.fotoKegiatan ? ` ${f.fotoKegiatan} foto kegiatan dari sesi ini bisa dilihat di atas.` : ""}`;
  }
  const sisa = Math.max(0, f.kuota - f.pesertaDiterima);
  return `${f.fase === "berlangsung hari ini" ? "Hari ini" : `${f.hari}`}, ${f.komunitas} bersama Tirtonic Tennis Store mengadakan sesi demo ${f.brand} ${f.produk} di ${tempat} pukul ${f.jam}. ` +
    `Peserta bisa mencoba langsung ${f.produk} sambil main bareng anggota komunitas.\n\n` +
    `Sesi ini terbuka untuk ${f.kuota} pemain${f.pesertaDiterima ? `, ${f.pesertaDiterima} sudah terdaftar` : ""}${sisa ? ` dan masih ada ${sisa} slot` : " dan kuota sudah penuh"}. ` +
    `Peserta terdaftar mendapat voucher ${f.voucher} setelah demo selesai.`;
}

const SYSTEM = `Kamu menulis deskripsi singkat untuk halaman satu sesi demo produk tenis di website Tirtonic Tennis Store (toko tenis di Jogja, Solo, Semarang).
Tulis dalam Bahasa Indonesia yang hangat dan santai, untuk pemain tenis yang membuka halaman ini.
Fokus pada SESI INI: komunitas penyelenggara, hari/tanggal, jam, lapangan, kota, produk yang dicoba, kapasitas & jumlah peserta, dan status acaranya (akan datang / hari ini / sudah selesai — sesuaikan tense-nya).
Pakai "infoProduk" hanya untuk menjelaskan produknya; abaikan kalimat di sana yang membahas acara secara umum.
Hanya pakai fakta dari data yang diberikan — jangan mengarang harga, nama pemain, hadiah, atau detail lain.
Jangan menulis langkah/cara pendaftaran dan jangan menyebut formulir.
Format: 2 paragraf pendek (total 60–110 kata), teks polos tanpa judul, tanpa markdown, tanpa emoji, tanpa tanda kutip pembuka.`;

async function generate(f: EventFacts): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) return templateDescription(f);
  try {
    const client = new Anthropic({ timeout: 30_000, maxRetries: 1 });
    const res = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "low" }, // tulisan pendek dari data → tak perlu mikir dalam
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content: `Data sesi demo:\n${JSON.stringify(f, null, 2)}` }],
    });
    if (res.stop_reason === "refusal") return templateDescription(f);
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    return text || templateDescription(f);
  } catch (e) {
    console.error("event-ai: gagal buat deskripsi", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    return templateDescription(f);
  }
}

/** Deskripsi acara; dibuat sekali per kombinasi fakta lalu disimpan di data cache Next (lintas request/deploy). */
export function eventDescription(claimId: string, f: EventFacts): Promise<string> {
  const key = createHash("sha1").update(JSON.stringify(f)).digest("hex").slice(0, 16);
  return unstable_cache(() => generate(f), ["event-ai", claimId, key], { revalidate: false })();
}
