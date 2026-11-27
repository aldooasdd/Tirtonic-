// Halaman kategori shop (/shop/<slug>): daftar kategori, atribut otomatis dari nama produk,
// definisi filter per kategori, dan penyaringan + hitungan per opsi. Pure (server & client).
import { isB1G1 } from "@/lib/b1g1";

export type Kat = {
  slug: string;
  db: string; // nilai kolom Product.kategori
  label: string;
  judul: string;
  intro: string;
  lebih: string; // teks "Baca selengkapnya"
  lab?: "raket" | "senar" | "sepatu"; // kategori yang punya data Tirtoniclab
};

export const KATS: Kat[] = [
  { slug: "raket", db: "Raket Tenis", label: "Raket", lab: "raket", judul: "Raket Tenis",
    intro: "Raket adalah alat paling menentukan perkembangan main tenis kamu. Pilih berdasarkan level, berat, head size, dan gaya pukulan, atau pakai skor Tirtoniclab untuk melihat power, kontrol, dan spin secara objektif.",
    lebih: "Pemula biasanya cocok dengan head size 100–110 in² dan berat 260–285 g supaya mudah diayun dan lebih toleran saat bola tidak kena tengah. Pemain menengah ke atas umumnya memilih 98–100 in² dengan berat 295–320 g untuk kontrol dan stabilitas lebih. Pola senar 16x19 memberi spin lebih banyak, sedangkan 18x20 lebih presisi. Masih ragu? Bandingkan sampai 4 raket di halaman Compare atau tanya tim kami lewat WhatsApp." },
  { slug: "senar", db: "String", label: "Senar", lab: "senar", judul: "Senar Tenis",
    intro: "Senar menentukan rasa pukulan sama besarnya dengan raket. Saring berdasarkan tipe, gauge, kemasan, dan skor lab untuk power, kontrol, spin, kenyamanan, dan daya tahan tension.",
    lebih: "Polyester (monofilament) memberi kontrol dan spin, cocok untuk pemain dengan ayunan cepat, tapi lebih kaku untuk lengan. Multifilament dan synthetic gut lebih nyaman dan bertenaga, cocok untuk pemula atau pemain dengan keluhan siku. Gauge lebih tipis (1.20–1.25) menambah spin dan rasa, gauge tebal (1.30+) lebih awet. Kami juga melayani jasa pasang senar di toko." },
  { slug: "sepatu", db: "Sepatu Tenis", label: "Sepatu", lab: "sepatu", judul: "Sepatu Tenis",
    intro: "Sepatu tenis dibuat untuk gerakan lateral, berhenti mendadak, dan sliding. Saring berdasarkan ukuran, gender, jenis lapangan, dan skor lab untuk kenyamanan, stabilitas, ketahanan, dan dinamis.",
    lebih: "Untuk lapangan hard court pilih sol all court yang awet; untuk lapangan tanah liat pilih sol clay dengan pola herringbone penuh. Pemain yang banyak bertahan di baseline butuh stabilitas dan bantalan, pemain menyerang butuh sepatu ringan dan responsif. Ukuran sepatu tenis biasanya pas dengan ukuran sepatu harian; kalau ragu, lihat size chart di halaman produk." },
  { slug: "apparel", db: "Apparel", label: "Apparel", judul: "Pakaian Tenis",
    intro: "Kaos, polo, celana, rok, dan jaket tenis dari brand favorit. Saring berdasarkan gender, jenis pakaian, dan ukuran.",
    lebih: "Pakaian tenis memakai bahan yang cepat kering dan elastis supaya nyaman dipakai bergerak ke segala arah. Cek size chart di halaman produk karena ukuran tiap brand bisa sedikit berbeda." },
  { slug: "tas", db: "Tas", label: "Tas", judul: "Tas Tenis",
    intro: "Tas raket, backpack, dan duffel untuk membawa perlengkapan ke lapangan. Saring berdasarkan jenis dan kapasitas raket.",
    lebih: "Tas dengan kompartemen thermo melindungi senar dari panas. Pilih kapasitas sesuai jumlah raket yang biasa kamu bawa: backpack untuk 1–2 raket, tas 6 raket untuk pemain rutin, 9–12 raket untuk turnamen." },
  { slug: "bola", db: "Bola Tenis", label: "Bola", judul: "Bola Tenis",
    intro: "Bola tenis untuk latihan dan pertandingan, dari kaleng hingga dus. Saring berdasarkan jenis dan kemasan.",
    lebih: "Bola bertekanan (pressurized) memberi pantulan terbaik tapi cepat kempis setelah dibuka; bola tanpa tekanan (pressureless) lebih awet untuk latihan. Untuk anak, gunakan bola stage merah, oranye, atau hijau yang lebih lambat." },
  { slug: "grip", db: "Grip", label: "Grip", judul: "Grip & Overgrip",
    intro: "Overgrip dan replacement grip untuk pegangan raket yang nyaman dan tidak licin.",
    lebih: "Overgrip dipasang di atas grip bawaan dan sebaiknya diganti rutin. Pilih tipe tacky untuk rasa lengket atau dry untuk tangan yang mudah berkeringat." },
  { slug: "damper", db: "Damper", label: "Damper", judul: "Damper", intro: "Peredam getaran senar untuk rasa pukulan yang lebih lembut.", lebih: "Damper mengurangi bunyi dan getaran senar setelah bola dipukul, tanpa banyak mengubah power." },
  { slug: "aksesoris", db: "Aksesoris", label: "Aksesoris", judul: "Aksesoris Tenis", intro: "Perlengkapan pendukung tenis: dari headband hingga alat latihan.", lebih: "Temukan perlengkapan kecil yang membuat latihan dan pertandingan lebih nyaman." },
  { slug: "topi", db: "Topi", label: "Topi", judul: "Topi Tenis", intro: "Topi dan visor untuk main di bawah terik matahari.", lebih: "Pilih bahan yang ringan dan cepat kering." },
  { slug: "wristband", db: "Wristband", label: "Wristband", judul: "Wristband", intro: "Wristband penyerap keringat.", lebih: "Menjaga tangan tetap kering supaya pegangan raket tidak licin." },
  { slug: "headband", db: "Headband/Headtie", label: "Headband", judul: "Headband & Headtie", intro: "Headband dan headtie penyerap keringat.", lebih: "Menjaga keringat tidak masuk ke mata saat bermain." },
  { slug: "kaos-kaki", db: "Kaos Kaki", label: "Kaos Kaki", judul: "Kaos Kaki Tenis", intro: "Kaos kaki tenis dengan bantalan dan penyerap keringat.", lebih: "Bantalan di tumit dan telapak mengurangi lecet saat banyak bergerak." },
];
export const katBySlug = (s: string) => KATS.find((k) => k.slug === s);

/** Produk ringkas yang dibutuhkan halaman kategori. */
export type Row = {
  id: string;
  slug: string | null;
  nama: string;
  brand: string | null;
  harga: number;
  hargaDiskon: number | null;
  gambar: string[];
  status: "READY" | "SOLD";
  stok: number | null;
  ukuran: string[];
  views: number;
  createdAt: string;
  atribut: Record<string, string[]>; // koreksi admin (menimpa hasil otomatis per kunci)
  variants: { warna: string; ukuran: string; stok: number; harga: number; hargaDiskon: number | null }[];
  lab: { skor: number | null; nilai: Record<string, number>; spek: Record<string, string> }[];
};

// ---------- atribut otomatis dari nama / varian / data lab ----------
const ada = (re: RegExp, s: string) => re.test(s);
const uniq = (xs: (string | null | undefined)[]) => [...new Set(xs.filter(Boolean) as string[])];
const LEVEL: Record<string, string> = { Beginner: "Pemula", Intermediate: "Menengah", Advanced: "Mahir", Expert: "Expert" };
const KEUNGGULAN: Record<string, string> = { Control: "Kontrol", Power: "Power", Versatility: "Serbaguna", Comfort: "Kenyamanan", Spin: "Spin", Maneuverability: "Manuver", "Great Maneuverability": "Manuver", Stability: "Stabilitas", Tolerance: "Toleransi", "Ball Touch": "Feel", Speed: "Kecepatan" };

function gender(n: string) {
  if (ada(/\b(gs|junior|jr|kids?|anak|boys?|girls?)\b/i, n)) return "Anak";
  if (ada(/\b(women'?s?|wanita|woman|ladies|w)\b/i, n)) return "Wanita";
  if (ada(/\bunisex\b/i, n)) return "Unisex";
  return "Pria";
}

const vnRow = (r: Row) => r.variants.map((v) => `${v.warna} ${v.ukuran}`).join(" | ");
const spekRow = (r: Row, k: string) => uniq(r.lab.map((l) => l.spek[k]));
/** Angka pertama di teks ("305g" → 305, "12.59in / 31.98cm" pakai pola khusus). */
const angka = (s: string | undefined, re = /([\d.]+)/) => { const m = s?.match(re); return m ? +m[1] : NaN; };
const gramRaket = (r: Row) => uniq([...spekRow(r, "Berat tanpa senar"), ...[...`${vnRow(r)} ${r.nama}`.matchAll(/(\d{3})\s*g/gi)].map((m) => m[1])])
  .map((g) => angka(g)).filter((g) => g >= 200 && g <= 360);
const headRaket = (r: Row) => [...spekRow(r, "Head size").map((h) => angka(h, /^(\d{2,3})/)),
  ...[...vnRow(r).matchAll(/(?:^|\s|\|)(9[5-9]|1[01]\d)(?=\s*[A-Za-z]*\s*\/|L|SL|UL|D|H|\s+Tour)/g)].map((m) => +m[1])].filter((h) => h >= 80 && h <= 125);
/** Spek singkat untuk kartu raket: berat, balance, head size, pola senar (yang tak diketahui = undefined). */
export function spekKartuRaket(r: Pick<Row, "nama" | "variants" | "lab">) {
  if (!/rac?ket|raket/i.test(r.nama) || /\b(junior|jr|anak|kids?)\b/i.test(r.nama)) return undefined;
  const x = r as Row;
  const g = gramRaket(x)[0];
  const bal = spekRow(x, "Balance").map((b) => angka(b, /([\d.]+)\s*cm/)).find((b) => b > 25 && b < 40);
  const h = headRaket(x)[0];
  const pola = [...spekRow(x, "Pola senar"), ...[...`${vnRow(x)} ${r.nama}`.matchAll(/\b(1[68]x(?:1[69]|20))\b/gi)].map((m) => m[1])][0];
  const s = { berat: g ? `${g}g` : undefined, balance: bal ? `${+bal.toFixed(1)}cm` : undefined, head: h ? `${Math.round(h * 6.4516)}cm²` : undefined, headIn: h ? `(${h}in²)` : undefined, pola };
  return s.berat || s.balance || s.head || s.pola ? s : undefined;
}

const WARNA: Record<string, string> = { gray: "Abu-abu", grey: "Abu-abu", abu: "Abu-abu", "abu-abu": "Abu-abu", black: "Hitam", white: "Putih", yellow: "Kuning", blue: "Biru", red: "Merah", green: "Hijau" };

/** Atribut hasil tebakan otomatis per kategori (kunci → nilai). */
export function otomatis(kat: Kat, r: Row): Record<string, string[]> {
  const n = r.nama;
  const vn = vnRow(r);
  const spek = (k: string) => spekRow(r, k);
  switch (kat.slug) {
    case "raket": {
      const junior = ada(/\b(junior|jr|anak|kids?)\b/i, n);
      const berat = uniq(gramRaket(r).map((g) => (g < 270 ? "< 270 g" : g < 290 ? "270–289 g" : g < 305 ? "290–304 g" : "305 g +")));
      const head = uniq(headRaket(r).map((h) => (h < 98 ? "< 98 in²" : h < 100 ? "98–99 in²" : h <= 100 ? "100 in²" : h < 105 ? "101–104 in²" : "105 in² +")));
      return {
        usia: [junior ? "Junior" : "Dewasa"],
        level: junior ? ["Pemula"] : uniq(spek("Level pemain").map((l) => LEVEL[l])),
        berat: junior ? [] : berat,
        head: junior ? [] : head,
        pola: uniq([...spek("Pola senar"), ...[...vn.matchAll(/\b(1[68]x(?:1[69]|20))\b/gi)].map((m) => m[1])]),
        keunggulan: uniq(spek("Keunggulan").flatMap((s) => s.split(/,\s*/)).map((s) => KEUNGGULAN[s.trim()])),
        grip: uniq(r.variants.flatMap((v) => [v.ukuran, v.warna]).map((x) => x.trim().toUpperCase().match(/^[GL]([0-5])$/)?.[1]).map((g) => g && `G${g}`)),
      };
    }
    case "senar": {
      const t = `${spek("Tipe").join(" ")} ${spek("Bahan").join(" ")} ${n}`;
      const tipe = ada(/hybrid/i, t) ? "Hybrid" : ada(/natural\s*gut/i, t) ? "Natural gut" : ada(/multi/i, t) ? "Multifilament" : ada(/synthetic|nylon|s-gut|syn gut/i, t) ? "Synthetic gut" : "Polyester (mono)";
      return {
        tipe: [tipe],
        gauge: uniq([...`${vn} ${n}`.matchAll(/\b(1\.[0-4]\d)\b/g)].map((m) => m[1])),
        kemasan: [ada(/reel|200\s*m|100\s*m|220\s*m/i, `${vn} ${n}`) ? "Reel" : "Set 12 m"],
        keunggulan: uniq(spek("Keunggulan").flatMap((s) => s.split(/,\s*/)).map((s) => KEUNGGULAN[s.trim()])),
        warna: uniq(r.variants.map((v) => v.warna.trim()).filter((w) => w && !/\d/.test(w)).map((w) => WARNA[w.toLowerCase()] ?? w[0].toUpperCase() + w.slice(1).toLowerCase())),
      };
    }
    case "sepatu":
      return {
        gender: [gender(n)],
        lapangan: [ada(/\b(clay|cly)\b/i, n) ? "Clay" : ada(/padel/i, n) ? "Padel" : "All court"],
        gaya: uniq(spek("Gaya main").map((g) => ({ Forward: "Menyerang", Versatile: "Serbaguna", Defender: "Bertahan" })[g])),
        keunggulan: uniq(spek("Keunggulan").flatMap((s) => s.split(/,\s*/)).map((s) => KEUNGGULAN[s.trim()])),
        stabilitas: uniq(spek("Stabilitas lateral").map((x) => ({ Standard: "Standar", Reinforced: "Diperkuat", Maximum: "Maksimal" })[x])),
        bantalan: uniq(spek("Cushioning").map((x) => ({ "Minimal (Responsive)": "Minimal (responsif)", Balanced: "Seimbang", Maximum: "Maksimal" })[x])),
        lebar: uniq(spek("Lebar kaki").map((x) => ({ Narrow: "Sempit", Standard: "Standar", Wide: "Lebar" })[x])),
        bobot: uniq([...spek("Berat (EU 42.5)"), ...spek("Berat (lab)").map((x) => x.match(/\((\d+)g\)/)?.[1])].map((g) => angka(g ?? undefined)).filter((g) => g > 200)
          .map((g) => (g < 350 ? "Ultra ringan (< 350 g)" : g <= 380 ? "Ringan (350–380 g)" : g <= 410 ? "Standar (381–410 g)" : "Kokoh (> 410 g)"))).slice(0, 1),
      };
    case "apparel": {
      const J: [RegExp, string][] = [[/polo/i, "Polo"], [/tank|singlet/i, "Tank top"], [/\b(skort|rok|skirt)\b/i, "Rok"], [/dress/i, "Dress"], [/legging|tights/i, "Legging"], [/\bbra\b/i, "Sports bra"], [/jacket|jaket|hoodie|windbreaker/i, "Jaket"], [/sweat|crew|pullover|long sleeve|lengan panjang/i, "Lengan panjang"], [/\b(short|shorts|celana|pants?|jogger)\b/i, "Celana"], [/\b(cap|topi|visor|hat)\b/i, "Topi"], [/\b(tee|t-?shirt|shirt|kaos|baju|top|crew)\b/i, "Kaos"]];
      return { gender: [gender(n)], jenis: [J.find(([re]) => re.test(n))?.[1] ?? "Lainnya"] };
    }
    case "tas": {
      const m = n.match(/(\d{1,2})\s*(?:r\b|pk\b|pack\b|racq?u?ets?|rackets?|raket)/i);
      const jenis = ada(/backpack|ransel/i, n) ? "Backpack" : m ? `${m[1]} raket` : ada(/duffel|duffle/i, n) ? "Duffel" : ada(/cover/i, n) ? "Cover raket" : ada(/tote/i, n) ? "Tote" : ada(/pouch|shoe bag|sling/i, n) ? "Pouch / tas kecil" : "Tas raket";
      return { jenis: [jenis] };
    }
    case "bola":
      return {
        jenis: [ada(/padel/i, n) ? "Padel" : ada(/\b(stage\s*3|red|merah)\b/i, n) ? "Anak (merah)" : ada(/\b(stage\s*2|orange|oranye)\b/i, n) ? "Anak (oranye)" : ada(/\b(stage\s*1|green|hijau)\b/i, n) ? "Anak (hijau)" : ada(/pressureless|tanpa tekanan/i, n) ? "Pressureless" : ada(/clay/i, n) ? "Clay court" : "All court"],
        kemasan: [ada(/bucket|ember/i, n) ? "Bucket" : ada(/\b(dus|box|karton|dozen|lusin|carton|72|18\s*(?:can|kaleng))\b/i, n) ? "Dus / box" : ada(/bag|kantong|polybag/i, n) ? "Kantong" : "Kaleng"],
      };
    case "grip":
      return { jenis: [ada(/replacement|base\s*grip|cushion|leather|syntec|grip\s*pengganti/i, n) && !ada(/over/i, n) ? "Replacement grip" : "Overgrip"], isi: uniq([n.match(/\b(\d{1,2})\s*(?:pcs|pc|pack|x|biji|grips?)\b/i)?.[1] ?? null]).map((x) => `${x} pcs`) };
    default:
      return {};
  }
}

/** Atribut final: koreksi admin menang per kunci. */
export const atribut = (kat: Kat, r: Row) => ({ ...otomatis(kat, r), ...Object.fromEntries(Object.entries(r.atribut || {}).filter(([, v]) => Array.isArray(v) && v.length)) });

/** Kunci atribut yang bisa dikoreksi admin per kategori (untuk form dashboard). */
export const ATRIBUT_FORM: Record<string, { key: string; label: string; contoh: string }[]> = {
  "Raket Tenis": [{ key: "usia", label: "Usia", contoh: "Dewasa / Junior" }, { key: "level", label: "Level", contoh: "Pemula, Menengah, Mahir, Expert" }, { key: "berat", label: "Berat", contoh: "< 270 g, 270–289 g, 290–304 g, 305 g +" }, { key: "head", label: "Head size", contoh: "100 in², 98–99 in²" }, { key: "pola", label: "Pola senar", contoh: "16x19, 18x20" }],
  String: [{ key: "tipe", label: "Tipe", contoh: "Polyester (mono), Multifilament, Synthetic gut, Natural gut, Hybrid" }, { key: "gauge", label: "Gauge", contoh: "1.25, 1.30" }, { key: "kemasan", label: "Kemasan", contoh: "Set 12 m / Reel" }],
  "Sepatu Tenis": [{ key: "gender", label: "Gender", contoh: "Pria / Wanita / Anak" }, { key: "lapangan", label: "Lapangan", contoh: "All court / Clay / Padel" }],
  Apparel: [{ key: "gender", label: "Gender", contoh: "Pria / Wanita / Anak / Unisex" }, { key: "jenis", label: "Jenis", contoh: "Kaos, Polo, Celana, Rok, Dress, Jaket, …" }],
  Tas: [{ key: "jenis", label: "Jenis", contoh: "Backpack, 6 raket, 12 raket, Duffel, …" }],
  "Bola Tenis": [{ key: "jenis", label: "Jenis", contoh: "All court, Clay court, Pressureless, Anak (merah), …" }, { key: "kemasan", label: "Kemasan", contoh: "Kaleng, Dus / box, Bucket" }],
  Grip: [{ key: "jenis", label: "Jenis", contoh: "Overgrip / Replacement grip" }, { key: "isi", label: "Isi", contoh: "3 pcs" }],
};

// ---------- filter ----------
// grup = judul bagian yang menampung beberapa filter (mis. "Spesifikasi"), seperti sidebar Extreme.
export type Facet =
  | { key: string; label: string; type: "multi"; get: (r: Row, a: Record<string, string[]>) => string[]; urut?: string[]; grup?: string }
  | { key: string; label: string; type: "range"; get: (r: Row) => number[]; step: number; unit?: string; grup?: string };

export const hargaJual = (h: number, d: number | null) => (d != null && d < h && !isB1G1(h, d) ? d : h);
export const hargaRow = (r: Row) => Math.min(...(r.variants.length ? r.variants : [r]).map((v) => hargaJual(v.harga, v.hargaDiskon)));
export const readyRow = (r: Row) => r.status !== "SOLD" && (r.variants.length ? r.variants.some((v) => v.stok > 0) : r.stok == null || r.stok > 0);
// "YONEX"/"yonex" → "Yonex" supaya brand tidak dobel; penulisan campuran (K-Swiss) dibiarkan.
const rapikan = (b: string) => (b === b.toUpperCase() || b === b.toLowerCase() ? b.toLowerCase().replace(/(^|[\s-])\S/g, (c) => c.toUpperCase()) : b);
const brandRow = (r: Row) => rapikan(r.brand?.trim() || r.nama.replace(/^(Promo\s+)?(Raket|Sepatu|Senar|Tas|Bola|Grip|Kaos Kaki|Topi)\s+(Tenis|Tennis)\s+/i, "").split(/\s+/)[0]);

const UKURAN_BAJU = ["XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL"];
const ukuranRow = (r: Row) => {
  const s = r.variants.filter((v) => v.stok > 0).flatMap((v) => [v.warna, v.ukuran]).concat(r.ukuran);
  return uniq(s.map((x) => x.trim().toUpperCase().replace(",", ".")).filter((x) => /^\d{2}(\.5)?$/.test(x) || UKURAN_BAJU.includes(x)));
};
const labMax = (r: Row, k: string) => {
  const v = r.lab.map((l) => (k === "skor" ? l.skor : l.nilai[k])).filter((x): x is number => x != null);
  return v.length ? Math.max(...v) : null;
};
const m = (key: string, label: string, urut?: string[], grup?: string): Facet => ({ key, label, type: "multi", get: (_r, a) => a[key] ?? [], urut, grup });
const rg = (key: string, label: string, step: number, unit: string, get: (r: Row) => number[], grup?: string): Facet => ({ key, label, type: "range", get, step, unit, grup });
const spekAngka = (k: string, re?: RegExp) => (r: Row) => spekRow(r, k).map((x) => angka(x, re)).filter((x) => !isNaN(x));
export const KRITERIA: Record<string, string[]> = {
  raket: ["Power", "Kontrol", "Kenyamanan", "Spin", "Toleransi", "Manuver", "Stabilitas"],
  senar: ["Power", "Kontrol", "Kenyamanan", "Spin", "Tahan tension", "Ketahanan"],
  sepatu: ["Kenyamanan", "Stabilitas", "Ketahanan", "Dinamis"],
};

export function facets(kat: Kat): Facet[] {
  const harga = rg("harga", "Harga", 50000, "", (r) => [hargaRow(r)]);
  const brand: Facet = { key: "brand", label: "Brand", type: "multi", get: (r) => [brandRow(r)] };
  const ukuran: Facet = { key: "ukuran", label: "Ukuran", type: "multi", get: (r) => ukuranRow(r) };
  const lab: Facet[] = kat.lab
    ? KRITERIA[kat.lab].map((k) => rg(`lab_${k}`, k, 1, "", (r) => r.lab.map((l) => l.nilai[k]).filter((x) => x != null), "Skor Tirtoniclab"))
    : [];
  const S = "Spesifikasi", X = "Data expert";
  const khusus: Record<string, Facet[]> = {
    raket: [m("level", "Level pemain", ["Pemula", "Menengah", "Mahir", "Expert"]),
      rg("berat", "Berat tanpa senar", 5, "g", gramRaket, S), rg("head", "Head size", 1, "in²", headRaket, S),
      rg("balance", "Balance", 0.5, "cm", (r) => spekAngka("Balance", /([\d.]+)\s*cm/)(r).filter((x) => x > 25 && x < 40), S), m("pola", "Pola senar", undefined, S),
      m("grip", "Grip size", ["G0", "G1", "G2", "G3", "G4", "G5"]), m("keunggulan", "Keunggulan"), m("usia", "Usia"),
      rg("ra", "Kekakuan frame", 1, "RA", spekAngka("Kekakuan (RA)"), X), rg("sw", "Swingweight", 1, "", spekAngka("Swingweight"), X), rg("tw", "Twistweight", 0.1, "", spekAngka("Twistweight"), X)],
    senar: [m("tipe", "Tipe"), m("keunggulan", "Keunggulan"), m("gauge", "Gauge"), m("kemasan", "Kemasan"), m("warna", "Warna")],
    sepatu: [ukuran, m("lapangan", "Lapangan"), m("gender", "Gender", ["Pria", "Wanita", "Anak", "Unisex"]),
      m("stabilitas", "Stabilitas lateral", ["Standar", "Diperkuat", "Maksimal"], S), m("bantalan", "Bantalan", ["Minimal (responsif)", "Seimbang", "Maksimal"], S),
      m("bobot", "Berat sepatu", ["Ultra ringan (< 350 g)", "Ringan (350–380 g)", "Standar (381–410 g)", "Kokoh (> 410 g)"], S), m("lebar", "Lebar kaki", ["Sempit", "Standar", "Lebar"], S),
      m("keunggulan", "Keunggulan"), m("gaya", "Gaya main")],
    apparel: [m("jenis", "Jenis pakaian"), m("gender", "Gender", ["Pria", "Wanita", "Anak", "Unisex"]), ukuran],
    tas: [m("jenis", "Jenis tas")],
    bola: [m("jenis", "Jenis bola"), m("kemasan", "Kemasan")],
    grip: [m("jenis", "Jenis"), m("isi", "Isi")],
  };
  return [harga, brand, ...(khusus[kat.slug] ?? []), ...lab];
}

/** "a-b", "a-", "-b", atau "a" (format lama = minimal) → [min, max] (NaN = tanpa batas). */
export const rentang = (s?: string) => { const [a, b = ""] = (s || "").split("-"); return [a ? +a : NaN, b ? +b : NaN] as const; };
const bulat = (x: number, st: number, f: (n: number) => number) => +(f(x / st) * st).toFixed(st < 1 ? 1 : 0);

/** Saring + hitung jumlah per opsi (tiap filter dihitung terhadap filter lain yang aktif). */
export function saring(kat: Kat, rows: Row[], q: Record<string, string | undefined>) {
  const fs = facets(kat);
  const attr = new Map(rows.map((r) => [r.id, atribut(kat, r)]));
  const pilih = (k: string) => (q[k] || "").split(",").filter(Boolean);
  const lolos = (r: Row, kecuali?: string) => {
    if (q.ready && !readyRow(r)) return false;
    if (q.diskon && hargaRow(r) >= r.harga) return false;
    for (const f of fs) {
      if (f.key === kecuali || !q[f.key]) continue;
      if (f.type === "multi") {
        const v = f.get(r, attr.get(r.id)!);
        if (!pilih(f.key).some((p) => v.includes(p))) return false;
      } else {
        const [a, b] = rentang(q[f.key]);
        if (!f.get(r).some((v) => !(v < a) && !(v > b))) return false;
      }
    }
    return true;
  };
  const hasil = rows.filter((r) => lolos(r));
  const opsi = fs.map((f) => {
    const dasar = rows.filter((r) => lolos(r, f.key));
    if (f.type === "range") {
      // batas slider dari semua produk kategori (stabil walau filter lain berubah)
      const vals = rows.flatMap(f.get);
      const ada = dasar.some((r) => f.get(r).length);
      return { key: f.key, label: f.label, type: f.type, grup: f.grup, opsi: [], min: vals.length ? bulat(Math.min(...vals), f.step, Math.floor) : 0, max: vals.length ? bulat(Math.max(...vals), f.step, Math.ceil) : 0, step: f.step, unit: f.unit, ada };
    }
    const hit = new Map<string, number>();
    for (const r of dasar) for (const v of new Set(f.get(r, attr.get(r.id)!))) hit.set(v, (hit.get(v) ?? 0) + 1);
    for (const p of pilih(f.key)) if (!hit.has(p)) hit.set(p, 0);
    const urut = f.urut ?? [];
    const list = [...hit.entries()].sort((a, b) => {
      const ia = urut.indexOf(a[0]), ib = urut.indexOf(b[0]);
      if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      if (f.key === "ukuran" || f.key === "gauge") return a[0].localeCompare(b[0], "en", { numeric: true });
      return b[1] - a[1] || a[0].localeCompare(b[0]);
    });
    return { key: f.key, label: f.label, type: f.type, grup: f.grup, opsi: list.map(([nilai, jumlah]) => ({ nilai, label: nilai, jumlah })) };
  }).filter((f) => (f.type === "range" ? "max" in f && f.max > f.min && f.ada : f.opsi.length > 1) || q[f.key]);

  const urut = q.sort || "";
  const skor = (r: Row) => labMax(r, urut.startsWith("lab_") ? urut.slice(4) : "skor") ?? -1;
  hasil.sort((a, b) =>
    urut === "price_asc" ? hargaRow(a) - hargaRow(b)
    : urut === "price_desc" ? hargaRow(b) - hargaRow(a)
    : urut === "newest" ? b.createdAt.localeCompare(a.createdAt)
    : urut === "skor" || urut.startsWith("lab_") ? skor(b) - skor(a)
    : Number(readyRow(b)) - Number(readyRow(a)) || b.views - a.views);
  return { hasil, opsi: opsi.map(({ ada: _a, ...f }: { ada?: boolean } & typeof opsi[number]) => f) };
}

// ponytail: self-check tebakan atribut; jalankan via tsx bila regex diubah.
export function demo() {
  const base: Row = { id: "x", slug: null, nama: "", brand: null, harga: 100, hargaDiskon: null, gambar: [], status: "READY", stok: null, ukuran: [], views: 0, createdAt: "", atribut: {}, variants: [], lab: [] };
  const k = (s: string) => katBySlug(s)!;
  const cek = (s: string, nama: string, key: string, harap: string) => {
    const v = atribut(k(s), { ...base, nama })[key];
    if (!v?.includes(harap)) throw new Error(`${nama} → ${key}=${v} (harap ${harap})`);
  };
  cek("sepatu", "Sepatu Tenis Asics Gel Resolution X GS White", "gender", "Anak");
  cek("sepatu", "Sepatu Tenis Mizuno Wave Enforce Tour 2 Women Lava Orange", "gender", "Wanita");
  cek("sepatu", "Sepatu Tenis Nike Vapor 12 Cly Camo Green", "lapangan", "Clay");
  cek("apparel", "Kaos Tenis Wilson Team Polo Women", "jenis", "Polo");
  cek("apparel", "Celana Tenis Nike Dri-Fit Short", "jenis", "Celana");
  cek("tas", "Tas Tenis Babolat Pure Aero 6R Bag", "jenis", "6 raket");
  cek("tas", "Tas Tenis Wilson Tour Backpack", "jenis", "Backpack");
  cek("senar", "Babolat Xcel Multifilament", "tipe", "Multifilament");
  cek("raket", "Raket Tenis Head Junior Novak Raket Tenis Anak", "usia", "Junior");
  if (atribut(k("raket"), { ...base, nama: "Raket Tenis Babolat Pure Aero", variants: [{ warna: "100 / 300g", ukuran: "G2", stok: 1, harga: 1, hargaDiskon: null }] }).berat?.[0] !== "290–304 g") throw new Error("berat varian");
  if (atribut(k("tas"), { ...base, nama: "Tas Wilson Backpack", atribut: { jenis: ["Duffel"] } }).jenis[0] !== "Duffel") throw new Error("koreksi admin harus menang");
  { const k = spekKartuRaket({ nama: "Raket Tenis Yonex Vcore 98 / 305gr Japan Tennis Racket", variants: [], lab: [{ skor: 1, nilai: {}, spek: { "Balance": "32cm / 6 pts HL", "Pola senar": "16x19" } }] }); if (k?.berat !== "305g" || k.balance !== "32cm" || k.head !== "632cm²" || k.pola !== "16x19") throw new Error("spekKartu " + JSON.stringify(k)); }
  if (brandRow({ ...base, brand: "YONEX" }) !== "Yonex" || brandRow({ ...base, brand: "K-Swiss" }) !== "K-Swiss" || brandRow({ ...base, brand: "new balance" }) !== "New Balance") throw new Error("brand");
  const sepatu = atribut(k("sepatu"), { ...base, nama: "Asics", lab: [{ skor: 1, nilai: {}, spek: { "Berat (lab)": "13.3 oz (376g)", Cushioning: "Balanced", "Lebar kaki": "Wide" } }] });
  if (sepatu.bobot[0] !== "Ringan (350–380 g)" || sepatu.bantalan[0] !== "Seimbang" || sepatu.lebar[0] !== "Lebar") throw new Error("spek sepatu");
  const rows = [{ ...base, id: "a", harga: 100 }, { ...base, id: "b", harga: 300 }];
  if (saring(k("bola"), rows, { harga: "200-" }).hasil.length !== 1 || saring(k("bola"), rows, { harga: "-150" }).hasil[0].id !== "a") throw new Error("rentang harga");
  if (atribut(k("raket"), { ...base, nama: "x", variants: [{ warna: "100/300g", ukuran: "G2", stok: 1, harga: 1, hargaDiskon: null }] }).grip[0] !== "G2") throw new Error("grip");
  return "ok";
}
