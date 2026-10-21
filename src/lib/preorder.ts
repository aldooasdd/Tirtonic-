import "server-only";
import { prisma } from "@/lib/prisma";
import { createDokuPayment, checkDokuStatus } from "@/lib/doku";
import { sendWa } from "@/lib/wa";
import { notifyN8N } from "@/lib/notify";
import { normalizePhone } from "@/lib/string-finder/phone";

export const MIN_DP = 100_000; // DP minimal Rp100.000
const PO_DUE_MIN = 5; // batas bayar DOKU untuk DP: 5 menit
const LUNAS_DAYS = 7; // batas pelunasan setelah barang ready
const LUNAS_DUE_MIN = LUNAS_DAYS * 1440; // link DOKU pelunasan berlaku sepanjang batas

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

// ── Template pesan WhatsApp (Bagian C) ───────────────────────────────────────
// Judul tebal di WA pakai *...*. Variabel diisi dari order.
type Ord = {
  id: string; invoice: string; nama: string; telepon: string; productNama: string;
  varian: string | null; estimasi: string | null; total: number; dp: number;
  kekurangan: number | null; batasPelunasan: Date | null; lunasUrl: string | null;
  kurir: string | null; resi: string | null; alamat: string; kota: string; status: string;
};

const TITLE = "*Tirtonic Exclusive Launch*";
const SIGN = `Salam hangat,${NL}Tirtonic Tennis Store`;
const L = (...xs: (string | null | undefined)[]) => xs.filter((x) => x != null).join(NL);
const linkPesanan = (id: string) => `${SITE}/preorder/order/${id}`;
const linkBayar = (id: string) => `${SITE}/preorder/order/${id}/bayar`; // auto-buat link DOKU baru → anti-expired
const fmtTgl = (d: Date) => d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
const lineVarian = (o: Ord) => (o.varian ? `Varian : ${o.varian}` : null);
const isPickup = (o: Ord) => o.alamat?.startsWith("AMBIL DI TOKO");
const opsiPenerimaan = (o: Ord) =>
  isPickup(o)
    ? `Produk siap diambil di Tirtonic ${o.kota}. Tunjukkan nomor pesanan saat pengambilan.`
    : "Produk akan kami kirimkan ke alamat Anda dalam 1–2 hari kerja.";

const msgReservasiLunas = (o: Ord) => L(
  TITLE, "",
  "Terima kasih, reservasi Anda telah kami terima dan pembayaran telah lunas.", "",
  `No. Pesanan : ${o.invoice}`, `Produk : ${o.productNama}`, lineVarian(o),
  `Total Dibayar : ${rupiah(o.total)}`, o.estimasi ? `Estimasi Tiba : ${o.estimasi}` : null, "",
  "Sebagai pembeli dengan pembayaran lunas, Anda mendapatkan:",
  "• Prioritas pengiriman/pengambilan", "• Gratis pasang senar", "• Gratis overgrip & dampener", "",
  "Kami akan mengabari Anda segera setelah produk tiba. Status pesanan dapat dipantau melalui:",
  linkPesanan(o.id), "", SIGN);

const msgReservasiDp = (o: Ord) => L(
  TITLE, "",
  "Terima kasih, reservasi Anda telah kami terima.", "",
  `No. Pesanan : ${o.invoice}`, `Produk : ${o.productNama}`, lineVarian(o),
  `DP Dibayar : ${rupiah(o.dp)}`, `Sisa Pembayaran : ${rupiah(o.total - o.dp)}`,
  o.estimasi ? `Estimasi Tiba : ${o.estimasi}` : null, "",
  "Slot reservasi Anda telah aman. Sisa pembayaran dapat dilunasi setelah produk tiba; kami akan mengirimkan informasi pelunasan melalui WhatsApp ini.", "",
  "Ingin menikmati benefit pembeli lunas seperti prioritas pengiriman dan gratis pasang senar? Anda dapat melunasi lebih awal kapan saja melalui:",
  linkPesanan(o.id), "", SIGN);

const msgProdukTibaLunas = (o: Ord) => L(
  TITLE, "",
  "Kabar baik, produk pesanan Anda telah tiba di Tirtonic.", "",
  `No. Pesanan : ${o.invoice}`, `Produk : ${o.productNama}`, lineVarian(o), opsiPenerimaan(o), "",
  "Benefit gratis pasang senar Anda siap digunakan. Silakan informasikan jenis senar dan tarikan yang diinginkan dengan membalas pesan ini.", "",
  SIGN);

const msgProdukTibaDp = (o: Ord) => L(
  TITLE, "",
  "Kabar baik, produk pesanan Anda telah tiba di Tirtonic.", "",
  `No. Pesanan : ${o.invoice}`, `Produk : ${o.productNama}`, lineVarian(o),
  `Sisa Pembayaran : ${rupiah(o.kekurangan ?? 0)}`,
  o.batasPelunasan ? `Batas Pelunasan : ${fmtTgl(o.batasPelunasan)}` : null, "",
  "Silakan selesaikan pelunasan melalui tautan berikut:",
  linkBayar(o.id), "",
  "Setelah pelunasan diterima, produk dapat langsung diambil di toko atau kami kirimkan ke alamat Anda.", "",
  SIGN);

const msgPengingat = (o: Ord) => L(
  TITLE, "",
  "Kami ingin mengingatkan bahwa pelunasan pesanan Anda akan berakhir dalam 2 hari.", "",
  `No. Pesanan : ${o.invoice}`, `Produk : ${o.productNama}`,
  `Sisa Pembayaran : ${rupiah(o.kekurangan ?? 0)}`,
  o.batasPelunasan ? `Batas Pelunasan : ${fmtTgl(o.batasPelunasan)}` : null, "",
  "Pelunasan dapat dilakukan melalui:",
  linkBayar(o.id), "",
  "Apabila pelunasan belum diterima hingga batas waktu, reservasi akan dibatalkan sesuai ketentuan pre-order. Jika ada kendala, silakan balas pesan ini dan tim kami akan membantu.", "",
  SIGN);

const msgPelunasanDiterima = (o: Ord) => L(
  TITLE, "",
  "Terima kasih, pelunasan pesanan Anda telah kami terima.", "",
  `No. Pesanan : ${o.invoice}`, `Produk : ${o.productNama}`,
  `Total Dibayar : ${rupiah(o.total)}`, opsiPenerimaan(o), "",
  "Status pesanan dapat dipantau melalui:", linkPesanan(o.id), "", SIGN);

const msgDibatalkan = (o: Ord, dpDibayar: boolean) => L(
  TITLE, "",
  "Dengan berat hati kami informasikan bahwa reservasi Anda telah dibatalkan karena pelunasan belum kami terima hingga batas waktu.", "",
  `No. Pesanan : ${o.invoice}`, `Produk : ${o.productNama}`,
  dpDibayar ? `Sesuai ketentuan pre-order, DP sebesar ${rupiah(o.dp)} kami konversi menjadi voucher belanja yang berlaku 3 bulan.` : null, "",
  "Apabila Anda masih berminat, silakan hubungi kami dengan membalas pesan ini. Kami akan membantu sesuai ketersediaan stok.", "",
  "Terima kasih atas pengertian Anda.", "", SIGN);

async function waTo(phone: string, message: string) {
  const p = normalizePhone(phone) ?? phone.replace(/\D/g, "");
  try { await sendWa(p, message); } catch { /* jangan gagalkan aksi utama */ }
}

/** Buat pesanan pre-order + link bayar DP di DOKU. Harga diverifikasi dari DB. */
export async function createPreorder(input: PreorderInput): Promise<CreatePreorderResult> {
  const nama = input.nama?.trim();
  const telepon = input.telepon?.trim();
  // Email tak diisi customer → fallback biar DOKU (butuh email valid) tetap jalan.
  const email = input.email?.trim() || `po${telepon?.replace(/\D/g, "")}@tirtonic.com`;
  const alamat = input.alamat?.trim();
  const kota = input.kota?.trim();
  const provinsi = input.provinsi?.trim();
  if (!nama || !telepon || !alamat || !kota || !provinsi) return { ok: false, error: "Lengkapi data pengiriman dulu." };

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
  const minDp = Math.max(1, p.dpMin); // dpMin 0 = tanpa minimum, tapi DP tetap harus > 0
  if (dp < minDp) return { ok: false, error: p.dpMin > 0 ? `DP minimal ${rupiah(p.dpMin)}.` : "Masukkan nominal DP." };
  if (dp > total) return { ok: false, error: "DP tidak boleh melebihi total harga." };

  const order = await prisma.preorderOrder.create({
    data: {
      invoice: genInvoice(),
      nama, email, telepon, alamat, kota, provinsi,
      kodePos: input.kodePos?.trim() || null,
      catatan: input.catatan?.trim() || null,
      productId: p.id, productNama: p.nama, variantId, varian, gambar: p.gambar[0] ?? null,
      estimasi: p.estimasi,
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

/** Pembayaran pertama lunas di DOKU (webhook). Bayar penuh → LUNAS (#1), DP → DP_PAID (#2). Idempoten. */
export async function markPreorderDpPaid(id: string, ref?: string): Promise<boolean> {
  const o = await prisma.preorderOrder.findUnique({ where: { id } });
  if (!o) return false;
  if (o.status !== "PENDING_DP") return true; // sudah diproses
  // ponytail: stok dipotong saat pembayaran pertama diterima (reserve on pay).
  if (o.variantId) {
    try { await prisma.preorderVariant.update({ where: { id: o.variantId }, data: { stok: { decrement: o.qty } } }); } catch { /* varian terhapus */ }
  }
  const lunasPenuh = o.dp >= o.total;
  const updated = await prisma.preorderOrder.update({
    where: { id },
    data: lunasPenuh
      ? { status: "LUNAS", dpPaidAt: new Date(), lunasAt: new Date(), paymentRefDp: ref ?? o.paymentRefDp }
      : { status: "DP_PAID", dpPaidAt: new Date(), paymentRefDp: ref ?? o.paymentRefDp },
  });
  await waTo(o.telepon, lunasPenuh ? msgReservasiLunas(updated) : msgReservasiDp(updated)); // #1 / #2
  return true;
}

/** Admin: barang ready (pembeli DP) → set kekurangan, batas pelunasan, link DOKU, WA #4. */
export async function confirmPreorderReady(id: string, kekurangan: number): Promise<{ ok: boolean; error?: string }> {
  const o = await prisma.preorderOrder.findUnique({ where: { id } });
  if (!o) return { ok: false, error: "Pesanan tidak ditemukan." };
  if (o.status !== "DP_PAID") return { ok: false, error: "Hanya pesanan yang DP-nya sudah lunas yang bisa dikonfirmasi ready." };
  const sisa = Math.max(0, Math.floor(kekurangan));
  if (sisa <= 0) return { ok: false, error: "Nominal kekurangan harus lebih dari 0." };

  const invoiceLunas = genInvoice("-LN");
  const batasPelunasan = new Date(Date.now() + LUNAS_DAYS * 86_400_000);
  const payUrl = await createDokuPayment({
    id: o.id, invoice: invoiceLunas, total: sisa,
    nama: o.nama, email: o.email, telepon: o.telepon,
    callbackPath: `/preorder/order/${o.id}`, dueMinutes: LUNAS_DUE_MIN,
  });

  const updated = await prisma.preorderOrder.update({
    where: { id },
    data: { status: "WAITING_LUNAS", kekurangan: sisa, readyAt: new Date(), invoiceLunas, batasPelunasan, lunasUrl: payUrl, reminderSentAt: null },
  });

  await waTo(o.telepon, msgProdukTibaDp(updated)); // #4
  return { ok: true };
}

/** Admin: barang tiba utk pembeli yang BAYAR PENUH di awal → WA #3. */
export async function confirmPreorderArrivedLunas(id: string): Promise<{ ok: boolean; error?: string }> {
  const o = await prisma.preorderOrder.findUnique({ where: { id } });
  if (!o) return { ok: false, error: "Pesanan tidak ditemukan." };
  if (o.status !== "LUNAS" || o.arrivedAt || o.readyAt) return { ok: false, error: "Hanya pesanan lunas yang barangnya belum ditandai tiba." };
  const updated = await prisma.preorderOrder.update({ where: { id }, data: { arrivedAt: new Date() } });
  await waTo(o.telepon, msgProdukTibaLunas(updated)); // #3
  return { ok: true };
}

/** Pelunasan lunas (webhook DOKU, dicocokkan via invoiceLunas) → LUNAS, WA #6. */
export async function markPreorderLunas(invoiceLunas: string, ref?: string): Promise<boolean> {
  const o = await prisma.preorderOrder.findUnique({ where: { invoiceLunas } });
  if (!o) return false;
  if (o.status !== "WAITING_LUNAS") return true;
  const updated = await prisma.preorderOrder.update({
    where: { id: o.id },
    data: { status: "LUNAS", lunasAt: new Date(), paymentRefLunas: ref ?? o.paymentRefLunas },
  });
  await waTo(o.telepon, msgPelunasanDiterima(updated)); // #6
  return true;
}

/** Admin: input resi (pengiriman) atau tandai diambil (pickup) → SHIPPED. WA #7 bila ada resi. */
export async function markPreorderShipped(id: string, resi: string, kurir?: string): Promise<{ ok: boolean; error?: string }> {
  const o = await prisma.preorderOrder.findUnique({ where: { id } });
  if (!o) return { ok: false, error: "Pesanan tidak ditemukan." };
  if (o.status !== "LUNAS" || !(o.arrivedAt || o.readyAt)) return { ok: false, error: "Barang belum ditandai tiba / belum lunas." };
  const noResi = resi?.trim() || null;
  const noKurir = kurir?.trim() || null;
  const updated = await prisma.preorderOrder.update({
    where: { id }, data: { status: "SHIPPED", resi: noResi, kurir: noKurir, shippedAt: new Date() },
  });
  // #7: pakai alur "shipped" yang sama dgn pesanan shop (n8n N8N_ORDER_SHIPPED_URL).
  // Pickup tanpa resi → tidak kirim notif pengiriman.
  if (noResi) {
    await notifyN8N("shipped", {
      id: updated.id, invoice: updated.invoice, nama: updated.nama, email: updated.email, telepon: updated.telepon,
      alamat: updated.alamat, kota: updated.kota, provinsi: updated.provinsi, kodePos: updated.kodePos,
      kurir: noKurir ?? "", ongkir: 0, subtotal: updated.total, diskon: 0, kupon: null,
      total: updated.total, status: updated.status, resi: noResi, metodeBayar: "DOKU", catatan: updated.catatan,
      items: [{ nama: updated.productNama, varian: updated.varian, harga: updated.harga, qty: updated.qty }],
    }, { orderUrl: linkPesanan(updated.id) });
  }
  return { ok: true };
}

/** Batalkan pesanan. Kirim WA #8 bila DP sudah dibayar (konversi voucher). */
export async function cancelPreorder(id: string): Promise<boolean> {
  const o = await prisma.preorderOrder.findUnique({ where: { id } });
  if (!o || o.status === "SHIPPED" || o.status === "CANCELLED") return false;
  const dpDibayar = o.status === "DP_PAID" || o.status === "WAITING_LUNAS"; // DP betul-betul masuk
  await prisma.preorderOrder.update({ where: { id }, data: { status: "CANCELLED" } });
  // Stok dipotong saat pembayaran pertama → kembalikan kalau dibatalkan setelah itu.
  if (o.variantId && (o.status === "DP_PAID" || o.status === "WAITING_LUNAS" || o.status === "LUNAS")) {
    try { await prisma.preorderVariant.update({ where: { id: o.variantId }, data: { stok: { increment: o.qty } } }); } catch { /* varian terhapus */ }
  }
  if (dpDibayar) await waTo(o.telepon, msgDibatalkan(o, true)); // #8
  return true;
}

/** Buat ulang link pelunasan DOKU (invoice baru, anti-expired) → URL bayar. Dipakai laman /bayar. */
export async function refreshPelunasanLink(id: string): Promise<{ ok: boolean; url?: string | null; error?: string }> {
  const o = await prisma.preorderOrder.findUnique({ where: { id } });
  if (!o) return { ok: false, error: "Pesanan tidak ditemukan." };
  if (o.status !== "WAITING_LUNAS") return { ok: false, error: "Pesanan tidak sedang menunggu pelunasan." };
  const sisa = o.kekurangan ?? Math.max(0, o.total - o.dp);
  if (sisa <= 0) return { ok: false, error: "Tidak ada sisa pembayaran." };

  const invoiceLunas = genInvoice("-LN"); // invoice DOKU harus unik tiap request
  const url = await createDokuPayment({
    id: o.id, invoice: invoiceLunas, total: sisa,
    nama: o.nama, email: o.email, telepon: o.telepon,
    callbackPath: `/preorder/order/${o.id}`, dueMinutes: LUNAS_DUE_MIN,
  });
  await prisma.preorderOrder.update({ where: { id }, data: { invoiceLunas, lunasUrl: url } });
  return { ok: true, url };
}

/** Cron: polling status DOKU (jaring kalau customer tak balik) + pengingat H-2 (#5)
 *  + auto-batal lewat batas (#8). Dipanggil dari /api/cron/preorder. */
export async function runPreorderCron(): Promise<{ paid: number; reminded: number; cancelled: number }> {
  const now = new Date();
  const soon = new Date(now.getTime() + 2 * 86_400_000); // 2 hari lagi
  let paid = 0, reminded = 0, cancelled = 0;

  // Polling status DOKU: webhook DOKU tak reliable → cek langsung order yang belum lunas.
  // DP belum dibayar (umur ≤3 hari biar tak polling order telantar).
  const pendingDp = await prisma.preorderOrder.findMany({
    where: { status: "PENDING_DP", createdAt: { gt: new Date(now.getTime() - 3 * 86_400_000) } },
    select: { id: true, invoice: true },
  });
  for (const o of pendingDp) {
    const st = await checkDokuStatus(o.invoice);
    if (st === "SUCCESS" || st === "PAID") { await markPreorderDpPaid(o.id); paid++; }
  }
  // Menunggu pelunasan → cek invoiceLunas.
  const waiting = await prisma.preorderOrder.findMany({
    where: { status: "WAITING_LUNAS", invoiceLunas: { not: null } },
    select: { invoiceLunas: true },
  });
  for (const o of waiting) {
    const st = await checkDokuStatus(o.invoiceLunas!);
    if (st === "SUCCESS" || st === "PAID") { await markPreorderLunas(o.invoiceLunas!); paid++; }
  }

  // Pengingat: batas dalam ≤2 hari, belum lewat, belum pernah diingatkan.
  const toRemind = await prisma.preorderOrder.findMany({
    where: { status: "WAITING_LUNAS", reminderSentAt: null, batasPelunasan: { gt: now, lte: soon } },
  });
  for (const o of toRemind) {
    await waTo(o.telepon, msgPengingat(o));
    await prisma.preorderOrder.update({ where: { id: o.id }, data: { reminderSentAt: now } });
    reminded++;
  }

  // Lewat batas → batalkan (#8 via cancelPreorder).
  const expired = await prisma.preorderOrder.findMany({
    where: { status: "WAITING_LUNAS", batasPelunasan: { lt: now } }, select: { id: true },
  });
  for (const o of expired) { if (await cancelPreorder(o.id)) cancelled++; }

  return { paid, reminded, cancelled };
}
