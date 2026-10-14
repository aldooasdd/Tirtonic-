import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Tambah 1 view produk. Dipanggil beacon dari halaman produk (yang sekarang di-cache ISR).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  await prisma.product.update({ where: { id: params.id }, data: { views: { increment: 1 } } }).catch(() => {});
  return new Response(null, { status: 204 });
}
