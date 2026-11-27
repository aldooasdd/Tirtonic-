// Tirtonic Match: kuis "cari perlengkapan ideal" (Find) dan "upgrade dari yang sekarang" (Optimise),
// dihitung dari skor lab Tirtoniclab (CompareItem.nilai, 0-100). Pure & client-safe (tanpa Prisma).
import type { Item, Kat } from "./compare-shared";

export type Bobot = Partial<Record<string, number>>;
export type Opsi = { v: string; label: string; hint?: string; w?: Bobot };
export type Tanya = { id: string; teks: string; opsi: Opsi[]; jika?: (j: Jawab) => boolean };
export type Jawab = Record<string, string>;

const jt = (n: number) => n * 1_000_000;
const rb = (n: number) => n * 1_000;

// ---------- Pertanyaan ----------
const sub = (prio: string, teks: string, opsi: Opsi[]): Tanya => ({ id: `sub_${prio}`, teks, opsi, jika: (j) => j.prioritas === prio });

const RAKET: Tanya[] = [
  { id: "gender", teks: "Kamu?", opsi: [{ v: "pria", label: "Pria" }, { v: "wanita", label: "Wanita" }, { v: "bebas", label: "Tidak ada preferensi" }] },
  { id: "level", teks: "Level main kamu?", opsi: [
    { v: "pemula", label: "Pemula", hint: "Baru mulai main tenis atau belum lama.", w: { Toleransi: 2, Kenyamanan: 1, Power: 1 } },
    { v: "menengah", label: "Menengah", hint: "Rutin main, teknik masih berkembang. Cari raket yang enak dan membantu naik level.", w: { Toleransi: 1 } },
    { v: "mahir", label: "Mahir", hint: "Rutin bertanding. Cari raket yang bisa mengeluarkan semua kemampuan.", w: { Kontrol: 1, Stabilitas: 1 } },
  ] },
  { id: "badan", teks: "Postur badan kamu?", opsi: [
    { v: "ringan", label: "Ramping / ringan", hint: "Butuh raket lincah yang tidak bikin lengan cepat capek.", w: { Manuver: 1 } },
    { v: "sedang", label: "Sedang / standar", hint: "Postur rata-rata, tenaga cukup, tanpa batasan khusus." },
    { v: "kuat", label: "Kekar / atletis", hint: "Kuat mengayun raket yang lebih berat dan stabil.", w: { Stabilitas: 1 } },
  ] },
  { id: "backhand", teks: "Backhand kamu?", opsi: [
    { v: "dua", label: "Dua tangan", hint: "Lebih stabil, cocok dengan raket yang berat dan bertenaga.", w: { Stabilitas: 0.5 } },
    { v: "satu", label: "Satu tangan", hint: "Lebih menuntut, pilih raket yang lincah dan seimbang.", w: { Manuver: 1, Kontrol: 0.5 } },
  ] },
  { id: "gaya", teks: "Gaya main kamu?", opsi: [
    { v: "agresif", label: "Baseliner agresif", hint: "Memukul keras, ambil bola lebih awal, langsung serang.", w: { Power: 1.5, Spin: 1, Stabilitas: 1 } },
    { v: "konsisten", label: "Baseliner konsisten", hint: "Bangun reli, kembalikan semua bola, tunggu lawan salah.", w: { Spin: 1, Toleransi: 1, Kontrol: 0.5 } },
    { v: "allround", label: "All-round", hint: "Sama enaknya main di baseline maupun di net." },
    { v: "net", label: "Net player / penyerang", hint: "Sering maju ke net untuk menguasai poin.", w: { Manuver: 1.5, Stabilitas: 1, Kontrol: 1 } },
  ] },
  { id: "lapangan", teks: "Paling sering main di lapangan apa?", opsi: [
    { v: "clay", label: "Tanah liat (clay)", hint: "Reli panjang, banyak topspin.", w: { Spin: 1 } },
    { v: "hard", label: "Hard court outdoor", hint: "Lapangan cepat, pukulan keras.", w: { Power: 0.5, Stabilitas: 0.5 } },
    { v: "indoor", label: "Indoor / karpet", hint: "Tempo cepat, pantulan rendah.", w: { Kontrol: 0.5, Manuver: 0.5 } },
    { v: "campur", label: "Campur", hint: "Ganti-ganti tergantung tempat dan musim." },
  ] },
  { id: "main", teks: "Kamu main tenis untuk apa?", opsi: [
    { v: "rekreasi", label: "Rekreasi, buat senang", hint: "Main untuk santai, tanpa beban hasil.", w: { Kenyamanan: 1, Toleransi: 1 } },
    { v: "klub", label: "Klub / komunitas / liga amatir", hint: "Rutin main di klub dan ingin berkembang." },
    { v: "kompetitif", label: "Kompetitif / turnamen", hint: "Ikut turnamen, performa benar-benar penting.", w: { Kontrol: 1, Stabilitas: 1 } },
  ] },
  { id: "prioritas", teks: "Apa yang paling kamu cari di raket berikutnya?", opsi: [
    { v: "power", label: "Lebih bertenaga", hint: "Bola lebih dalam dengan lebih mudah.", w: { Power: 3 } },
    { v: "kontrol", label: "Lebih terkontrol", hint: "Arah bola lebih tepat, lebih sedikit error.", w: { Kontrol: 3 } },
    { v: "spin", label: "Lebih banyak spin", hint: "Topspin lebih mudah, pukulan lebih aman.", w: { Spin: 3 } },
    { v: "serba", label: "Lebih serba bisa", hint: "Raket lengkap yang efektif di semua situasi." },
    { v: "nyaman", label: "Lebih nyaman", hint: "Rasa lebih empuk dan menjaga lengan.", w: { Kenyamanan: 3 } },
  ] },
  sub("power", "Power yang seperti apa?", [
    { v: "mudah", label: "Power tanpa usaha", hint: "Bola melaju tanpa harus dipaksa.", w: { Power: 1, Toleransi: 1 } },
    { v: "manuver", label: "Power + lincah", hint: "Raket tetap ringan diayun.", w: { Manuver: 1.5 } },
    { v: "spin", label: "Power + spin", hint: "Bola berat dengan topspin.", w: { Spin: 1.5 } },
    { v: "stabil", label: "Power + stabil", hint: "Tetap solid saat tempo cepat.", w: { Stabilitas: 1.5 } },
  ]),
  sub("kontrol", "Kontrol yang seperti apa?", [
    { v: "maks", label: "Kontrol maksimal", hint: "Bidikan lebih presisi.", w: { Kontrol: 1.5 } },
    { v: "stabil", label: "Kontrol + stabil", hint: "Tetap presisi walau ditekan.", w: { Stabilitas: 1.5 } },
    { v: "spin", label: "Kontrol + spin", hint: "Margin aman lebih besar dengan topspin.", w: { Spin: 1.5 } },
    { v: "toleransi", label: "Kontrol + sedikit toleransi", hint: "Presisi tanpa raket yang terlalu menuntut.", w: { Toleransi: 1.5 } },
  ]),
  sub("spin", "Spin yang seperti apa?", [
    { v: "mudah", label: "Topspin yang mudah", hint: "Memberi putaran dengan lebih gampang.", w: { Spin: 1, Toleransi: 1 } },
    { v: "kontrol", label: "Topspin + kontrol", hint: "Bola berputar tanpa kehilangan presisi.", w: { Kontrol: 1.5 } },
    { v: "power", label: "Topspin + power", hint: "Bola lebih berat dan agresif.", w: { Power: 1.5 } },
    { v: "manuver", label: "Topspin + lincah", hint: "Kepala raket lebih mudah diakselerasi.", w: { Manuver: 1.5 } },
  ]),
  sub("serba", "Serba bisa yang seperti apa?", [
    { v: "seimbang", label: "Paling seimbang", hint: "Kompromi power, kontrol, dan kenyamanan.", w: { Power: 1, Kontrol: 1, Kenyamanan: 1 } },
    { v: "toleransi", label: "Lebih toleran", hint: "Tetap enak walau kena bola tidak pas.", w: { Toleransi: 2 } },
    { v: "manuver", label: "Lebih lincah", hint: "Terasa hidup dan mudah dimainkan.", w: { Manuver: 2 } },
    { v: "stabil", label: "Lebih stabil", hint: "Terasa mantap saat benturan.", w: { Stabilitas: 2 } },
  ]),
  sub("nyaman", "Nyaman yang seperti apa?", [
    { v: "lengan", label: "Melindungi lengan", hint: "Kalau siku, pergelangan, atau bahu sensitif.", w: { Kenyamanan: 2 } },
    { v: "toleransi", label: "Nyaman + toleran", hint: "Paling gampang dimainkan.", w: { Kenyamanan: 1, Toleransi: 1.5 } },
  ]),
  { id: "lengan", teks: "Ada keluhan di lengan, siku, atau pergelangan?", opsi: [
    { v: "tidak", label: "Tidak ada", hint: "Bebas pilih tanpa batasan kenyamanan." },
    { v: "sedikit", label: "Sedikit", hint: "Ingin rasa yang sedikit lebih empuk.", w: { Kenyamanan: 1 } },
    { v: "parah", label: "Cukup mengganggu", hint: "Kenyamanan harus jadi prioritas.", w: { Kenyamanan: 3 } },
  ] },
  { id: "budget", teks: "Budget kamu?", opsi: [
    { v: String(jt(2)), label: "Di bawah Rp2 juta" }, { v: String(jt(3)), label: "Di bawah Rp3 juta" },
    { v: String(jt(4)), label: "Di bawah Rp4 juta" }, { v: "0", label: "Tanpa batas" },
  ] },
];

const SENAR: Tanya[] = [
  { id: "level", teks: "Level main kamu?", opsi: [
    { v: "pemula", label: "Pemula", hint: "Baru mulai atau belum lama main.", w: { Kenyamanan: 1.5, Power: 1 } },
    { v: "menengah", label: "Menengah", hint: "Rutin main, teknik terus berkembang." },
    { v: "mahir", label: "Mahir", hint: "Rutin bertanding.", w: { Kontrol: 1 } },
  ] },
  { id: "frekuensi", teks: "Seberapa sering kamu main?", opsi: [
    { v: "1", label: "Seminggu sekali", hint: "Santai, sesekali tanding." },
    { v: "2", label: "2-3 kali seminggu", hint: "Main rutin.", w: { Ketahanan: 1, "Tahan tension": 0.5 } },
    { v: "4", label: "4 kali atau lebih", hint: "Latihan berat.", w: { Ketahanan: 2, "Tahan tension": 1 } },
  ] },
  { id: "lengan", teks: "Ada keluhan di lengan, siku, atau pergelangan?", opsi: [
    { v: "tidak", label: "Tidak ada", hint: "Bebas pilih tanpa batasan kenyamanan." },
    { v: "sedikit", label: "Sedikit", hint: "Lebih suka rasa yang agak empuk.", w: { Kenyamanan: 1.5 } },
    { v: "parah", label: "Cukup mengganggu", hint: "Kenyamanan wajib jadi prioritas.", w: { Kenyamanan: 4 } },
  ] },
  { id: "prioritas", teks: "Apa yang paling kamu cari?", opsi: [
    { v: "power", label: "Power", hint: "Bola lebih dalam tanpa dipaksa.", w: { Power: 3 } },
    { v: "kontrol", label: "Kontrol", hint: "Penempatan lebih tepat, lebih akurat.", w: { Kontrol: 3 } },
    { v: "spin", label: "Spin", hint: "Topspin dan slice lebih banyak.", w: { Spin: 3 } },
    { v: "nyaman", label: "Kenyamanan", hint: "Rasa empuk, menjaga lengan.", w: { Kenyamanan: 3 } },
    { v: "awet", label: "Ketahanan", hint: "Selama mungkin sebelum putus.", w: { Ketahanan: 3 } },
    { v: "serba", label: "Serba bisa", hint: "Kompromi seimbang di semua aspek." },
  ] },
  { id: "gaya", teks: "Gaya main kamu?", opsi: [
    { v: "agresif", label: "Pemukul agresif", hint: "Sudah punya power, senarnya perlu menahan supaya bola tidak out.", w: { Kontrol: 1.5 } },
    { v: "konsisten", label: "Stabil / counter-puncher", hint: "Bangun poin dan menempatkan bola. Senar perlu memberi dorongan.", w: { Power: 1.5 } },
    { v: "topspin", label: "Pemain topspin", hint: "Topspin berat, bola tinggi di atas net.", w: { Spin: 1.5 } },
    { v: "touch", label: "Touch / volley / flat", hint: "Slice, drop shot, main di net, atau pukulan datar.", w: { Kontrol: 1, Kenyamanan: 1 } },
  ] },
  { id: "senar", teks: "Senar yang kamu pakai sekarang?", opsi: [
    { v: "mono", label: "Monofilamen (polyester)", hint: "Senar kaku, umum di kalangan kompetitif." },
    { v: "multi", label: "Multifilamen", hint: "Senar lembut, ramah di lengan." },
    { v: "gut", label: "Natural gut", hint: "Rasa terbaik, mahal dan rapuh." },
    { v: "tahu", label: "Tidak tahu", hint: "Tidak apa-apa, tetap bisa dihitung." },
  ] },
  { id: "budget", teks: "Budget untuk satu set senar?", opsi: [
    { v: String(rb(100)), label: "Di bawah Rp100 ribu" }, { v: String(rb(200)), label: "Di bawah Rp200 ribu" },
    { v: String(rb(350)), label: "Di bawah Rp350 ribu" }, { v: "0", label: "Tanpa batas" },
  ] },
];

const SEPATU: Tanya[] = [
  { id: "gender", teks: "Sepatu untuk?", opsi: [{ v: "pria", label: "Pria" }, { v: "wanita", label: "Wanita" }, { v: "bebas", label: "Tidak ada preferensi" }] },
  { id: "lapangan", teks: "Paling sering main di lapangan apa?", opsi: [
    { v: "clay", label: "Tanah liat (clay)", hint: "Butuh sol pola herringbone penuh untuk sliding." },
    { v: "hard", label: "Hard court", hint: "Butuh sol awet dan bantalan yang baik.", w: { Ketahanan: 1 } },
    { v: "campur", label: "Campur", hint: "Ganti-ganti lapangan." },
  ] },
  { id: "lebar", teks: "Lebar kaki kamu?", opsi: [
    { v: "Narrow", label: "Ramping", hint: "Sepatu biasa sering terasa longgar." },
    { v: "Standard", label: "Normal", hint: "Ukuran standar umumnya pas." },
    { v: "Wide", label: "Lebar", hint: "Sepatu biasa sering terasa sempit di depan." },
  ] },
  { id: "gaya", teks: "Gaya main kamu?", opsi: [
    { v: "Defender", label: "Baseline / bertahan", hint: "Banyak lari kiri-kanan dan reli panjang.", w: { Stabilitas: 1.5, Ketahanan: 1 } },
    { v: "Versatile", label: "All-court", hint: "Seimbang di semua area lapangan." },
    { v: "Forward", label: "Sering ke net / menyerang", hint: "Gerakan eksplosif, maju-mundur cepat.", w: { Dinamis: 2 } },
  ] },
  { id: "prioritas", teks: "Apa yang paling kamu cari?", opsi: [
    { v: "nyaman", label: "Nyaman", hint: "Bantalan empuk sepanjang main.", w: { Kenyamanan: 3 } },
    { v: "stabil", label: "Stabil", hint: "Kaki terkunci saat gerakan menyamping.", w: { Stabilitas: 3 } },
    { v: "awet", label: "Awet", hint: "Sol tahan lama walau sering dipakai.", w: { Ketahanan: 3 } },
    { v: "lincah", label: "Ringan & lincah", hint: "Responsif untuk gerakan cepat.", w: { Dinamis: 3 } },
  ] },
  { id: "keluhan", teks: "Ada keluhan di kaki, lutut, atau tumit?", opsi: [
    { v: "tidak", label: "Tidak ada" },
    { v: "sedikit", label: "Sedikit", hint: "Ingin bantalan sedikit lebih empuk.", w: { Kenyamanan: 1.5 } },
    { v: "parah", label: "Cukup mengganggu", hint: "Bantalan dan stabilitas harus jadi prioritas.", w: { Kenyamanan: 3, Stabilitas: 1 } },
  ] },
  { id: "budget", teks: "Budget kamu?", opsi: [
    { v: String(jt(1)), label: "Di bawah Rp1 juta" }, { v: String(jt(1.5)), label: "Di bawah Rp1,5 juta" },
    { v: String(jt(2.5)), label: "Di bawah Rp2,5 juta" }, { v: "0", label: "Tanpa batas" },
  ] },
];

export const PERTANYAAN: Record<Kat, Tanya[]> = { raket: RAKET, senar: SENAR, sepatu: SEPATU };
export const KRITERIA: Record<Kat, string[]> = {
  raket: ["Power", "Kontrol", "Kenyamanan", "Spin", "Toleransi", "Manuver", "Stabilitas"],
  senar: ["Power", "Kontrol", "Kenyamanan", "Spin", "Tahan tension", "Ketahanan"],
  sepatu: ["Kenyamanan", "Stabilitas", "Ketahanan", "Dinamis"],
};

/** Pertanyaan yang tampil untuk jawaban sekarang (sub-pertanyaan tergantung prioritas). */
export const urutan = (kat: Kat, j: Jawab) => PERTANYAAN[kat].filter((t) => !t.jika || t.jika(j));

// ---------- Angka dari spek ----------
const angka = (s: string | undefined, re: RegExp) => { const m = s?.match(re); return m ? parseFloat(m[1]) : null; };
/** Berat raket tanpa senar (g). Kalau cuma ada berat dengan senar, dikurangi ~15 g. */
export const beratRaket = (it: Item) => {
  const a = angka(it.spek["Berat tanpa senar"], /(\d{3})\s*g/);
  if (a) return a;
  const b = angka(it.spek["Berat dengan senar"], /(\d{3})\s*g/);
  return b ? b - 15 : null;
};
const headIn = (it: Item) => { const s = it.spek["Head size"]; return angka(s, /(\d+(?:\.\d+)?)\s*in/) ?? angka(s, /^(\d{2,3})\b/); };
const ra = (it: Item) => angka(it.spek["Kekakuan (RA)"], /(\d+)/);
const wanita = (it: Item) => /\b(women|woman|wanita|wmns?|lady)\b|\bW\b/i.test(it.nama);

// ---------- Find ----------
export type Hasil = { it: Item; pct: number; alasan: string };

/** Rentang berat ideal (g, tanpa senar) dari level, postur, gender. */
export function rentangBerat(j: Jawab): [number, number] {
  const [a, b] = j.level === "pemula" ? [255, 285] : j.level === "mahir" ? [290, 320] : [270, 305];
  const d = (j.badan === "ringan" ? -10 : j.badan === "kuat" ? 10 : 0) + (j.gender === "wanita" ? -10 : 0);
  return [a + d, b + d];
}

/** Bobot tiap kriteria: dasar 1 + jumlah bobot dari setiap jawaban. */
export function bobot(kat: Kat, j: Jawab): Record<string, number> {
  const w: Record<string, number> = Object.fromEntries(KRITERIA[kat].map((k) => [k, 1]));
  for (const t of urutan(kat, j)) for (const [k, v] of Object.entries(t.opsi.find((o) => o.v === j[t.id])?.w ?? {})) w[k] = (w[k] ?? 1) + (v ?? 0);
  return w;
}

/** Penalti (poin) karena tidak cocok batasan: berat, head size, kekakuan, gender, lapangan, lebar kaki, tipe senar. */
function penalti(kat: Kat, j: Jawab, it: Item): number {
  let p = 0;
  if (kat === "raket") {
    const g = beratRaket(it), [lo, hi] = rentangBerat(j);
    if (g) p += Math.min(25, Math.max(0, lo - g, g - hi) * 0.8);
    const h = headIn(it);
    if (h && j.level === "pemula" && h < 100) p += (100 - h) * 1.5;
    const r = ra(it);
    if (r && j.lengan === "parah" && r > 66) p += (r - 66) * 1.5;
  }
  if (kat === "senar") {
    const mono = /mono/i.test(it.spek.Tipe ?? "") || /poly/i.test(it.spek.Bahan ?? "");
    if (mono && j.lengan === "parah") p += 12;
    if (mono && j.level === "pemula") p += 5;
    if (j.senar === "multi" && mono && j.lengan !== "tidak") p += 4;
  }
  if (kat === "sepatu") {
    const w = wanita(it);
    if (j.gender === "pria" && w) p += 30;
    if (j.gender === "wanita" && !w) p += 8; // banyak sepatu unisex/pria masih bisa, tapi didahulukan model wanita
    const lap = it.spek.Lapangan ?? "";
    if (j.lapangan === "clay" && lap && !/clay/i.test(lap)) p += 6;
    if (j.lapangan === "hard" && /^clay$/i.test(lap)) p += 10;
    const lebar = it.spek["Lebar kaki"];
    if (lebar && j.lebar && lebar !== j.lebar) p += j.lebar === "Wide" && lebar === "Narrow" ? 15 : 6;
  }
  return p;
}

const kecil = (k: string) => k.toLowerCase();
/** Alasan singkat: 2 kriteria dengan bobot tinggi yang nilainya paling kuat. */
function alasan(w: Record<string, number>, it: Item) {
  const penting = Object.keys(it.nilai).filter((k) => (w[k] ?? 1) > 1).sort((a, b) => w[b] - w[a] || it.nilai[b] - it.nilai[a]); // yang paling kamu minta dulu
  const kuat = penting.filter((k) => it.nilai[k] >= 70).slice(0, 2);
  const daftar = (ks: string[]) => ks.map((k) => `${kecil(k)} (${it.nilai[k]})`).join(" dan ");
  if (kuat.length) return `Kuat di ${daftar(kuat)}, sesuai yang kamu cari.`;
  if (penting.length) return `Pilihan paling seimbang untuk jawabanmu, terutama di ${daftar(penting.slice(0, 1))}.`;
  return "Seimbang di semua aspek, cocok dengan profilmu.";
}

/** Skor kecocokan 0-99: rata-rata nilai lab berbobot dikurangi penalti. */
export function cocok(kat: Kat, j: Jawab, it: Item, w = bobot(kat, j)): number {
  let t = 0, n = 0;
  for (const [k, v] of Object.entries(it.nilai)) { t += (w[k] ?? 1) * v; n += w[k] ?? 1; }
  if (!n) return 0;
  return Math.max(1, Math.min(99, Math.round(t / n - penalti(kat, j, it))));
}

/** 3 rekomendasi teratas (ready, punya skor lab, masuk budget), satu per produk. */
export function rekomendasi(kat: Kat, j: Jawab, items: Item[], n = 3): Hasil[] {
  const w = bobot(kat, j), max = +j.budget || Infinity, lihat = new Set<string>();
  return items
    .filter((it) => it.ready && Object.keys(it.nilai).length && it.harga <= max)
    .map((it) => ({ it, pct: cocok(kat, j, it, w), alasan: alasan(w, it) }))
    .sort((a, b) => b.pct - a.pct || a.it.harga - b.it.harga)
    .filter((h) => { const k = [h.it.href, JSON.stringify(h.it.nilai)]; if (k.some((x) => lihat.has(x))) return false; k.forEach((x) => lihat.add(x)); return true; }) // 1 per produk & 1 per model (warna lain = data lab sama)
    .slice(0, n);
}

// ---------- Optimise ----------
export type Arah = Record<string, number>; // -2..2 per kriteria (0 = seperti sekarang)
export const LABEL_ARAH: Record<string, string> = { "-2": "Jauh lebih rendah", "-1": "Sedikit lebih rendah", "0": "Seperti sekarang", "1": "Sedikit lebih", "2": "Jauh lebih" };

/** Tujuan cepat (chip) per kategori → preset slider. */
export const TUJUAN: Record<Kat, { label: string; arah: Arah }[]> = {
  raket: [
    { label: "+ Power", arah: { Power: 2, Toleransi: 1 } },
    { label: "+ Kontrol", arah: { Kontrol: 2, Stabilitas: 1 } },
    { label: "+ Spin", arah: { Spin: 2, Kontrol: 1, Manuver: 1 } },
    { label: "Lindungi lengan", arah: { Kenyamanan: 2 } },
    { label: "Lebih toleran", arah: { Toleransi: 2, Kenyamanan: 1 } },
    { label: "Lebih lincah", arah: { Manuver: 2 } },
    { label: "+ Stabilitas", arah: { Stabilitas: 2 } },
  ],
  senar: [
    { label: "+ Power", arah: { Power: 2 } },
    { label: "+ Kontrol", arah: { Kontrol: 2 } },
    { label: "+ Spin", arah: { Spin: 2 } },
    { label: "Lindungi lengan", arah: { Kenyamanan: 2 } },
    { label: "Lebih awet", arah: { Ketahanan: 2, "Tahan tension": 1 } },
  ],
  sepatu: [
    { label: "Lebih nyaman", arah: { Kenyamanan: 2 } },
    { label: "Lebih stabil", arah: { Stabilitas: 2 } },
    { label: "Lebih awet", arah: { Ketahanan: 2 } },
    { label: "Lebih lincah", arah: { Dinamis: 2 } },
  ],
};

export type Upgrade = { it: Item; nilai: number; gain: number; bintang: 1 | 2 | 3; label: string };

/** Kandidat pengganti: naik di sumbu yang diminta, tidak turun (>3 poin) di sumbu "seperti sekarang". */
export function upgrade(cur: Item, arah: Arah, items: Item[], berat?: [number, number], n = 3): Upgrade[] {
  const target = Object.entries(arah).filter(([, s]) => s);
  if (!target.length) return [];
  const lihat = new Set([cur.href, JSON.stringify(cur.nilai)]);
  return items
    .filter((it) => it.ready && Object.keys(it.nilai).length && it.kategori === cur.kategori)
    .filter((it) => { if (!berat) return true; const g = beratRaket(it); return !g || (g >= berat[0] && g <= berat[1]); })
    .map((it) => {
      let gain = 0, loss = 0, kena = 0;
      for (const k of Object.keys(cur.nilai)) {
        const d = (it.nilai[k] ?? cur.nilai[k]) - cur.nilai[k], s = arah[k] ?? 0;
        if (s) { gain += s * d; if (Math.sign(d) === Math.sign(s) && Math.abs(d) >= 2) kena++; }
        else loss += Math.max(0, -d - 3);
      }
      const nilai = gain - 0.5 * loss;
      const bintang = (kena === target.length && loss < 10 ? 3 : kena * 2 >= target.length && loss < 25 ? 2 : 1) as 1 | 2 | 3; // banyak turun di sumbu lain = Terbatas
      return { it, nilai, gain, bintang, label: bintang === 3 ? "Sangat cocok" : bintang === 2 ? "Cocok" : "Terbatas" };
    })
    .filter((u) => u.gain > 0) // minimal ada perbaikan di arah yang diminta; sisanya diurutkan dari untung-rugi
    .sort((a, b) => b.nilai - a.nilai)
    .filter((u) => { const k = [u.it.href, JSON.stringify(u.it.nilai)]; if (k.some((x) => lihat.has(x))) return false; k.forEach((x) => lihat.add(x)); return true; })
    .slice(0, n);
}

/** Self-check: node -e via tsx. */
export function demo() {
  const it = (nama: string, nilai: Record<string, number>, spek: Record<string, string> = {}, harga = jt(3)): Item =>
    ({ id: nama, productId: nama, kategori: "raket", nama, varian: "", href: "/" + nama, foto: null, ready: true, harga, skor: null, nilai, spek, sumber: [] });
  const spin = it("Spinner", { Power: 70, Kontrol: 65, Kenyamanan: 70, Spin: 92, Toleransi: 70, Manuver: 70, Stabilitas: 70 }, { "Berat tanpa senar": "300g" });
  const ctrl = it("Kontroler", { Power: 60, Kontrol: 90, Kenyamanan: 65, Spin: 65, Toleransi: 60, Manuver: 70, Stabilitas: 80 }, { "Berat tanpa senar": "305g" });
  const berat = it("Berat", { Power: 70, Kontrol: 70, Kenyamanan: 70, Spin: 92, Toleransi: 70, Manuver: 60, Stabilitas: 80 }, { "Berat tanpa senar": "340g" });
  const mahal = it("Mahal", { Power: 90, Kontrol: 90, Kenyamanan: 90, Spin: 95, Toleransi: 90, Manuver: 90, Stabilitas: 90 }, {}, jt(5));
  const j: Jawab = { level: "menengah", badan: "sedang", prioritas: "spin", budget: String(jt(4)) };
  const r = rekomendasi("raket", j, [ctrl, spin, berat, mahal]);
  console.assert(r[0].it.nama === "Spinner", "spin dulu", r);
  console.assert(!r.some((h) => h.it.nama === "Mahal"), "budget dipatuhi");
  console.assert(r.findIndex((h) => h.it.nama === "Berat") > 0, "raket 340g kena penalti");
  console.assert(urutan("raket", j).some((t) => t.id === "sub_spin") && !urutan("raket", j).some((t) => t.id === "sub_power"), "sub-pertanyaan ikut prioritas");
  const u = upgrade(ctrl, { Spin: 2 }, [ctrl, spin, berat], [290, 320]); // raket 340g di luar rentang berat
  console.assert(u[0]?.it.nama === "Spinner" && u.length === 1, "upgrade spin + filter berat", u);
  console.log("match demo ok", r.map((h) => `${h.it.nama} ${h.pct}%`), u.map((x) => `${x.it.nama} ${x.label}`));
}
