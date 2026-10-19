import "server-only";
import { prisma } from "@/lib/prisma";
import { createDokuPayment } from "@/lib/doku";
import { sendWa, salam } from "@/lib/wa";
import { normalizePhone } from "@/lib/string-finder/phone";

export const MIN_DP = 100_000; // DP minimal Rp100.000
const PO_DUE_MIN = 1440; // batas bayar DOKU untuk PO: 1 hari

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://tirtonic.com").replace(/\/$/, "");
const rupiah = (n: number) => "Rp " + Number(n || 0).toLocaleString("id-ID");
const NL = "\n";

export type PreorderInput = {
  productId: string;
  variantId?: string;
  qty: number;
  dp: number;
  nama: string; email: string; telepon: string;
  alamat: string; kota: string; provinsi: string; kodePos?: string; catatan?: string;
};

export type CreatePreorderResult =
  | { ok: true; orderId: string; invoice: string; paymentUrl: string | null }
  | { ok: false; error: string };

function genInvoice(suffix = ""): string {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PO-${ymd}-${rand}${suffix}`;
}

/** Buat pesanan pre-order + link bayar DP di DOKU. Harga diverifikasi dari DB. */
export async function createPreorder(input: PreorderInput): Promise<CreatePreorderResult> {
  const nama = input.nama?.trim();
  const email = input.email?.trim();
  const telepon = input.telepon?.trim();
  const alamat = input.alamat?.trim();
  const kota = input.kota?.trim();
  const provinsi = input.provinsi?.trim();
  if (!nama || !email || !telepon || !alamat || !kota || !provinsi) return { ok: false, error: "Lengkapi data pengiriman dulu." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Email tidak valid." };

  const p = await prisma.preorderProduct.findUnique({ where: { id: input.productId }, include: { variants: true } });
  if (!p || !p.isActive) return { ok: false, error: "Produk pre-order tidak tersedia." };

  const qty = Math.max(1, Math.floor(input.qty || 1));

  // Varian: kalau produk punya varian, wajib pilih + cek stok. Harga ikut varian.
  let hargaSatuan = p.harga;
  let variantId: string | null = null;
  let varian: string | null = null;
  if (p.variants.length > 0) {
    const v = p.variants.find((x) => x.id === input.variantId);
    if (!v) return { ok: false, error: "Pilih varian dulu." };
    const label = v.ukuran ? `${v.warna} / ${v.ukuran}` : v.warna;
    if (v.stok < qty) return { ok: false, error: `Stok varian ${label} tinggal ${v.stok}.` };
    hargaSatuan = v.harga; variantId = v.id; varian = label;
  }

  const total = hargaSatuan * qty;
  const dp = Math.floor(input.dp || 0);
  if (dp < MIN_DP) return { ok: false, error: `DP minimal ${rupiah(MIN_DP)}.` };
  if (dp > total) return { ok: false, error: "DP tidak boleh melebihi total harga." };

  const order = await prisma.preorderOrder.create({
    data: {
      invoice: genInvoice(),
      nama, email, telepon, alamat, kota, provinsi,
      kodePos: input.kodePos?.trim() || null,
      catatan: input.catatan?.trim() || null,
      productId: p.id, productNama: p.nama, variantId, varian, gambar: p.gambar[0] ?? null,
      harga: hargaSatuan, qty, total, dp,
    },
  });

  const paymentUrl = await createDokuPayment({
    id: order.id, invoice: order.invoice, total: dp,
    nama, email, telepon,
    callbackPath: `/preorder/order/${order.id}`, dueMinutes: PO_DUE_MIN,
  });

  return { ok: true, orderId: order.id, invoice: order.invoice, paymentUrl };
}

/** DP lunas (dipanggil webhook DOKU). Idempoten. Kirim WA konfirmasi ke customer. */
export async function markPreorderDpPaid(id: string, ref?: string): Promise<boolean> {
  const o = await prisma.preorderOrder.findUnique({ where: { id } });
  if (!o) return false;
  if (o.status !== "PENDING_DP") return true; // sudah diproses
  await prisma.preorderOrder.update({
    where: { id },
    data: { status: "DP_PAID", dpPaidAt: new Date(), paymentRefDp: ref ?? o.paymentRefDp },
  });
  // ponytail: stok dipotong saat DP lunas (reserve on DP). Race create→DP minim, abaikan.
  if (o.variantId) {
    try { await prisma.preorderVariant.update({ where: { id: o.variantId }, data: { stok: { decrement: o.qty } } }); } catch { /* varian terhapus */ }
  }
  const sisa = o.total - o.dp;
  await waTo(o.telepon,
    `Selamat ${salam()} kak ${o.nama} 🎾${NL}${NL}` +
    `Terima kasih! DP pesanan *pre-order* sudah kami terima.${NL}${NL}` +
    `Invoice : ${o.invoice}${NL}Produk : ${o.productNama} (x${o.qty})${NL}` +
    `Total : ${rupiah(o.total)}${NL}DP dibayar : ${rupiah(o.dp)}${NL}Sisa : ${rupiah(sisa)}${NL}${NL}` +
    `Barangnya sedang kami siapkan. Begitu barang ready, kami kirim info pelunasan sisa pembayaran lewat WhatsApp ini. 🙌`);
  return true;
}

/** Admin: barang ready → set kekurangan, buat link bayar DOKU, kirim WA ke customer. */
export async function confirmPreorderReady(id: string, kekurangan: number): Promise<{ ok: boolean; error?: string }> {
  const o = await prisma.preorderOrder.findUnique({ where: { id } });
  if (!o) return { ok: false, error: "Pesanan tidak ditemukan." };
  if (o.status !== "DP_PAID") return { ok: false, error: "Hanya pesanan yang DP-nya sudah lunas yang bisa dikonfirmasi ready." };
  const sisa = Math.max(0, Math.floor(kekurangan));
  if (sisa <= 0) return { ok: false, error: "Nominal kekurangan harus lebih dari 0." };

  const invoiceLunas = genInvoice("-LN");
  await prisma.preorderOrder.update({
    where: { id },
    data: { status: "WAITING_LUNAS", kekurangan: sisa, readyAt: new Date(), invoiceLunas },
  });

  const payUrl = await createDokuPayment({
    id: o.id, invoice: invoiceLunas, total: sisa,
    nama: o.nama, email: o.email, telepon: o.telepon,
    callbackPath: `/preorder/order/${o.id}`, dueMinutes: PO_DUE_MIN,
  });

  await waTo(o.telepon,
    `Selamat ${salam()} kak ${o.nama} 🎾${NL}${NL}` +
    `Kabar baik! Barang pre-order kamu sudah *ready*.${NL}${NL}` +
    `Invoice : ${o.invoice}${NL}Produk : ${o.productNama} (x${o.qty})${NL}` +
    `Total : ${rupiah(o.total)}${NL}DP : ${rupiah(o.dp)}${NL}*Sisa pembayaran : ${rupiah(sisa)}*${NL}${NL}` +
    (payUrl ? `Silakan lunasi di sini:${NL}${payUrl}${NL}${NL}` : `Silakan lakukan pelunasan. Hubungi admin untuk cara bayar.${NL}${NL}`) +
    `Setelah lunas, pesanan langsung kami proses & kirim. 🙌`);
  return { ok: true };
}

/** Pelunasan lunas (webhook DOKU, dicocokkan via invoiceLunas). Kirim WA ke customer. */
export async function markPreorderLunas(invoiceLunas: string, ref?: string): Promise<boolean> {
  const o = await prisma.preorderOrder.findUnique({ where: { invoiceLunas } });
  if (!o) return false;
  if (o.status !== "WAITING_LUNAS") return true;
  await prisma.preorderOrder.update({
    where: { id: o.id },
    data: { status: "LUNAS", lunasAt: new Date(), paymentRefLunas: ref ?? o.paymentRefLunas },
  });
  await waTo(o.telepon,
    `Selamat ${salam()} kak ${o.nama} 🎾${NL}${NL}` +
    `Pelunasan pesanan *pre-order* ${o.invoice} sudah kami terima. Lunas ✅${NL}${NL}` +
    `${o.productNama} (x${o.qty}) akan segera kami proses & kirim. Terima kasih sudah menunggu! 🙌`);
  return true;
}

export async function cancelPreorder(id: string): Promise<boolean> {
  const o = await prisma.preorderOrder.findUnique({ where: { id }, select: { status: true, variantId: true, qty: true } });
  if (!o || o.status === "LUNAS" || o.status === "CANCELLED") return false;
  await prisma.preorderOrder.update({ where: { id }, data: { status: "CANCELLED" } });
  // Stok sudah dipotong saat DP lunas → kembalikan kalau dibatalkan setelah itu.
  if (o.variantId && (o.status === "DP_PAID" || o.status === "WAITING_LUNAS")) {
    try { await prisma.preorderVariant.update({ where: { id: o.variantId }, data: { stok: { increment: o.qty } } }); } catch { /* varian terhapus */ }
  }
  return true;
}

async function waTo(phone: string, message: string) {
  const p = normalizePhone(phone) ?? phone.replace(/\D/g, "");
  try { await sendWa(p, message); } catch { /* jangan gagalkan aksi utama */ }
}
