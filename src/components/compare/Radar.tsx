// Grafik radar SVG sederhana: tiap seri = satu barang, skala 0–100.
// Warna per slot dibuat saling jauh (biru, oranye, ungu, hijau) supaya gampang dibedakan, juga oleh buta warna merah-hijau.
export const WARNA = ["#2563EB", "#F97316", "#9333EA", "#16A34A"];

export default function Radar({ kriteria, seri, size = 300 }: {
  kriteria: readonly string[];
  seri: { nilai: Record<string, number>; warna: string }[];
  size?: number;
}) {
  const c = size / 2, r = size / 2 - 46, n = kriteria.length;
  const titik = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + Math.cos(a) * r * (v / 100), c + Math.sin(a) * r * (v / 100)] as const;
  };
  const poly = (v: (i: number) => number) => kriteria.map((_, i) => titik(i, v(i)).join(",")).join(" ");
  return (
    <svg viewBox={`-40 0 ${size + 80} ${size}`} className="h-auto w-full max-w-[380px]" role="img" aria-label="Grafik radar skor">
      {[25, 50, 75, 100].map((g) => (
        <polygon key={g} points={poly(() => g)} fill="none" stroke="#E5E7EB" strokeWidth={1} />
      ))}
      {kriteria.map((k, i) => {
        const [x, y] = titik(i, 100);
        const [lx, ly] = titik(i, 122);
        return (
          <g key={k}>
            <line x1={c} y1={c} x2={x} y2={y} stroke="#E5E7EB" />
            <text x={lx} y={ly} fontSize={11} textAnchor="middle" dominantBaseline="middle" fill="#4B5563">{k}</text>
          </g>
        );
      })}
      {seri.map((s, j) => (
        <polygon key={j} points={poly((i) => s.nilai[kriteria[i]] ?? 0)} fill={s.warna} fillOpacity={0.15} stroke={s.warna} strokeWidth={2} />
      ))}
    </svg>
  );
}
