import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAuthed } from "@/lib/auth";
import { prisma, safeQuery } from "@/lib/prisma";
import { updateProduct } from "@/app/dasbord/actions";
import ProductForm from "@/components/ProductForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit Produk — Tirtonic" };

export default async function EditProductPage({ params }: { params: { id: string } }) {
  if (!isAuthed()) redirect("/dasbord/login");

  const product = await safeQuery(() => prisma.product.findUnique({ where: { id: params.id } }), null);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/dasbord" className="text-sm text-gray-500 hover:text-primary">← Kembali ke dashboard</Link>
      <h1 className="mb-6 mt-2 text-2xl font-extrabold text-primary">Edit Produk</h1>
      <ProductForm action={updateProduct.bind(null, product.id)} product={product} />
    </div>
  );
}
