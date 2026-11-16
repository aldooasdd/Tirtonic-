// Tumpukan avatar peserta: foto profil member kalau ada, selain itu logo Tirtonic (sama dgn leaderboard).
export type Person = { name: string; photo: string | null };

export default function AvatarStack({ people, max = 5, size = "h-6 w-6" }: { people: Person[]; max?: number; size?: string }) {
  if (!people.length) return null;
  const more = people.length - max;
  return (
    <span className="inline-flex items-center">
      {people.slice(0, max).map((p, i) => (
        <span key={i} title={p.name} className={`${size} -ml-1.5 first:ml-0 grid shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-2 ring-white`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img loading="lazy" src={p.photo || "/logo.png"} alt="" className={p.photo ? "h-full w-full object-cover" : "h-3/4 w-3/4 object-contain"} />
        </span>
      ))}
      {more > 0 && <span className={`${size} -ml-1.5 grid shrink-0 place-items-center rounded-full bg-neutral-100 text-[9px] font-[700] text-neutral-600 ring-2 ring-white`}>+{more}</span>}
    </span>
  );
}

/** Ambil foto profil member untuk daftar peserta (1 query). */
export async function withPhotos<T extends { name: string; phone: string }>(rows: T[]): Promise<Person[]> {
  if (!rows.length) return [];
  const { prisma } = await import("@/lib/prisma");
  const ms = await prisma.member.findMany({ where: { phone: { in: rows.map((r) => r.phone) } }, select: { phone: true, photo: true } });
  const m = new Map(ms.map((x) => [x.phone, x.photo]));
  return rows.map((r) => ({ name: r.name, photo: m.get(r.phone) ?? null }));
}
