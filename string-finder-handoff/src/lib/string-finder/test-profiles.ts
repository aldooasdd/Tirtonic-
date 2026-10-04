import type { Answers } from "./types";

// 8 profil uji untuk pratinjau editor aturan (bandingkan aturan lama vs baru).
export const TEST_PROFILES: { label: string; answers: Answers }[] = [
  { label: "Pemula, spin", answers: { level: "pemula", swing: "santai", priorities: ["spin", "power"], arm: "tidak", change: "cepat", breakage: "sering", tension: "rendah" } },
  { label: "Rutin, kontrol", answers: { level: "rutin", swing: "sedang", priorities: ["control", "spin"], arm: "tidak", change: "sedang", breakage: "kadang", tension: "sedang" } },
  { label: "Kompetitif, spin+kontrol", answers: { level: "kompetitif", swing: "cepat", priorities: ["spin", "control"], arm: "tidak", change: "cepat", breakage: "sering", tension: "tinggi" } },
  { label: "Lengan cedera, nyaman", answers: { level: "rutin", swing: "sedang", priorities: ["comfort", "control"], arm: "cedera", change: "lama", breakage: "tidak", tension: "rendah" } },
  { label: "Power murni", answers: { level: "pemula", swing: "santai", priorities: ["power", "comfort"], arm: "pegal", change: "lama", breakage: "tidak", tension: "sedang" } },
  { label: "Kompetitif, nyaman", answers: { level: "kompetitif", swing: "cepat", priorities: ["comfort", "power"], arm: "pegal", change: "sedang", breakage: "kadang", tension: "sedang" } },
  { label: "Sering putus", answers: { level: "rutin", swing: "cepat", priorities: ["spin", "power"], arm: "tidak", change: "cepat", breakage: "sering", tension: "tinggi" } },
  { label: "Tidak tahu tensi", answers: { level: "rutin", swing: "sedang", priorities: ["control", "comfort"], arm: "tidak", change: "sedang", breakage: "kadang", tension: "tidaktahu" } },
];
