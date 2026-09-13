import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ponytail: fixed "Our Store" photo slots. Foto (1080x1080) & maps link diisi via dashboard/DB.
const stores = [
  { nama: "Visit Us", alamat: "Yogyakarta · Solo · Semarang", jam: null as string | null, maps: null as string | null, urutan: 1 },
  { nama: "Solo", alamat: "Jl. Samratulangi No.20, Surakarta", jam: "Everyday | 9am-7pm", maps: null as string | null, urutan: 2 },
  { nama: "Yogyakarta", alamat: "Jl. Sedan Asri No.84, Sleman", jam: "Everyday | 9am-7pm", maps: null as string | null, urutan: 3 },
  { nama: "Semarang", alamat: "Semarang", jam: "Everyday | 9am-7pm", maps: null as string | null, urutan: 4 },
];

async function main() {
  for (const s of stores) {
    const existing = await prisma.store.findFirst({ where: { nama: s.nama } });
    if (existing) {
      await prisma.store.update({ where: { id: existing.id }, data: { alamat: s.alamat, jam: s.jam, urutan: s.urutan } });
    } else {
      await prisma.store.create({ data: s });
    }
  }
  console.log("Seeded stores:", await prisma.store.count());
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
