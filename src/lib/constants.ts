export const KATEGORI = [
  "Sepatu Tenis",
  "Raket Tenis",
  "String",
  "Grip",
  "Tas",
  "Aksesoris",
  "Bola Tenis",
  "Apparel",
  "Topi",
  "Wristband",
  "Headband/Headtie",
  "Damper",
  "Kaos Kaki",
] as const;

export const SHOE_SIZES = [
  "35,5", "36,5", "37", "37,5", "38", "38,5", "39", "39,5",
  "40", "40,5", "41", "41,5", "42", "42,5", "43", "43,5",
  "44", "44,5", "45", "45,5", "46",
];

export const JENIS_EVENT = ["Turnamen", "Coaching Clinic", "Ekshibisi", "Lainnya"];

export const BENTUK_SPONSORSHIP = [
  "Produk (raket, bola, apparel)",
  "Hadiah Turnamen",
  "Uang Tunai",
  "Publikasi/Promosi",
  "Lainnya",
];

export const PRICE_RANGES = [
  { value: "0-500000", label: "< Rp500.000" },
  { value: "500000-1000000", label: "Rp500.000 – Rp1.000.000" },
  { value: "1000000-2000000", label: "Rp1.000.000 – Rp2.000.000" },
  { value: "2000000-", label: "> Rp2.000.000" },
];

// Filter diskon shop (persen potongan harga coret). Yang tampil hanya range yang ada produknya.
export const DISKON_RANGES = [
  { value: "1-10", label: "Diskon 1–10%", min: 1, max: 10 },
  { value: "11-20", label: "Diskon 11–20%", min: 11, max: 20 },
  { value: "21-30", label: "Diskon 21–30%", min: 21, max: 30 },
  { value: "31-40", label: "Diskon 31–40%", min: 31, max: 40 },
  { value: "41-", label: "Diskon > 40%", min: 41, max: 100 },
];

// Category-listing product-type filter reuses KATEGORI.
export const SORT_OPTIONS = [
  { value: "populer", label: "Populer" },
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

// Gratis ongkir kalau belanja (setelah potongan kupon) ≥ ini. Dipakai checkout (client) & createOrder (server).
export const FREE_ONGKIR_MIN = 500_000;
