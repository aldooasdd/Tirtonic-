import "server-only";

// Kirim event pesanan ke workflow n8n (yang mengurus WA + email ke customer).
// Web TIDAK mengirim WA/email sendiri — hanya mem-POST data ke webhook n8n.
// Set URL-nya lewat env; kalau kosong → no-op (aman sebelum n8n dibuat).

type NotifyKind = "paid" | "shipped";

type OrderItemLike = { nama: string; varian: string | null; harga: number; qty: number };
type OrderLike = {
  id: string;
  invoice: string;
  nama: string;
  email: string;
  telepon: string;
  alamat: string;
  kota: string;
  provinsi: string;
  kodePos: string | null;
  kurir: string;
  ongkir: number;
  subtotal: number;
  total: number;
  status: string;
  resi: string | null;
  metodeBayar: string | null;
  items: OrderItemLike[];
};

function urlFor(kind: NotifyKind): string | null {
  const paid = process.env.N8N_ORDER_PAID_URL || "";
  const shipped = process.env.N8N_ORDER_SHIPPED_URL || "";
  const u = kind === "paid" ? paid : shipped;
  return u.trim() || null;
}

/** Fire-and-forget POST ke n8n. Tidak pernah melempar error (biar tak menggagalkan order). */
export async function notifyN8N(kind: NotifyKind, order: OrderLike): Promise<void> {
  const url = urlFor(kind);
  if (!url) return; // belum dikonfigurasi

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://tirtonic.com";
  const payload = {
    event: kind, // "paid" | "shipped"
    invoice: order.invoice,
    orderUrl: `${base}/order/${order.id}`,
    customer: { nama: order.nama, email: order.email, telepon: order.telepon },
    alamat: { alamat: order.alamat, kota: order.kota, provinsi: order.provinsi, kodePos: order.kodePos },
    kurir: order.kurir,
    resi: order.resi,
    metodeBayar: order.metodeBayar,
    ongkir: order.ongkir,
    subtotal: order.subtotal,
    total: order.total,
    status: order.status,
    items: order.items.map((i) => ({ nama: i.nama, varian: i.varian, harga: i.harga, qty: i.qty })),
  };

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.N8N_WEBHOOK_SECRET ? { "x-webhook-secret": process.env.N8N_WEBHOOK_SECRET } : {}),
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(t);
  } catch (e) {
    console.error(`notifyN8N(${kind}) gagal:`, e);
  }
}
