import type { Answers } from "./types";

// Ringkasan profil satu kalimat (identik dengan prototype.html).
export function profileSentence(a: Answers): string {
  const L = {
    level: { pemula: "Baru mulai", rutin: "Rutin main", kompetitif: "Pemain kompetitif" } as Record<string, string>,
    swing: { santai: "ayunan santai", sedang: "ayunan sedang", cepat: "ayunan penuh dan cepat" } as Record<string, string>,
    p: { spin: "spin", power: "power", control: "kontrol", comfort: "kenyamanan" } as Record<string, string>,
    arm: { tidak: "tanpa keluhan lengan", pegal: "lengan kadang pegal", cedera: "sedang cedera lengan" } as Record<string, string>,
    change: {
      cepat: "ganti senar kurang dari sebulan sekali",
      sedang: "ganti senar tiap 1 sampai 3 bulan",
      lama: "ganti senar lebih dari 3 bulan sekali",
    } as Record<string, string>,
    breakage: { sering: "senar sering putus", kadang: "senar kadang putus", tidak: "senar tidak pernah putus" } as Record<string, string>,
    tension: {
      rendah: "tensi di bawah 48 lbs",
      sedang: "tensi 48 sampai 55 lbs",
      tinggi: "tensi di atas 55 lbs",
      tidaktahu: "tensi belum diketahui",
    } as Record<string, string>,
  };
  const pr = (a.priorities || []).map((x) => L.p[x]);
  return (
    [
      L.level[a.level as string],
      L.swing[a.swing as string],
      pr.length ? "prioritas " + pr.join(" lalu ") : null,
      L.arm[a.arm as string],
      L.change[a.change as string],
      L.breakage[a.breakage as string],
      L.tension[a.tension as string],
    ]
      .filter(Boolean)
      .join(", ") + "."
  );
}
