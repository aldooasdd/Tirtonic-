"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, isAuthed, requireSection, currentRole } from "@/lib/auth";
import { findRoleByPassword, roleMatches, setRolePassword, hashPassword } from "@/lib/role-password";
import { verifyPickupToken, verifyReturnToken } from "@/lib/pickup-token";
import { uploadFile, uploadFromUrl, storageConfigured } from "@/lib/storage";
import { fetchTokopedia } from "@/lib/tokopedia";
import { markOrderPaid, markOrderShipped, markOrderDelivered, cancelOrder } from "@/lib/orders";
import { slugify } from "@/lib/article-slug";
import { sendWa } from "@/lib/wa";
import { createCommunitySession } from "@/lib/community-auth";

/** Slug unik untuk artikel: dari judul, tambah -2/-3 kalau bentrok. */
async function uniqueArticleSlug(judul: string, excludeId?: string): Promise<string> {
  const base = slugify(judul) || "artikel";
  let slug = base;
  // ponytail: naive probe; artikel sedikit, bentrok judul langka
  for (let n = 2; ; n++) {
    const found = await prisma.article.findUnique({ where: { slug }, select: { id: true } });
    if (!found || found.id === excludeId) return slug;
    slug = `${base}-${n}`;
  }
}

export type LoginState = { error: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const pw = (formData.get("password") as string) || "";
  const role = await findRoleByPassword(pw);
  if (!role) return { error: "Password salah." };
  createSession(role);
  redirect("/dashboard");
}

export async function logout() {
  destroySession();
  redirect("/dashboard/login");
}

function revalidatePublic(productId?: string) {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/dashboard");
  if (productId) revalidatePath(`/product/${productId}`);
}

async function uploadImages(formData: FormData): Promise<string[]> {
  const files = formData.getAll("gambar").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return [];
  if (!storageConfigured) throw new Error("Supabase Storage belum dikonfigurasi (cek .env).");
  const urls: string[] = [];
  for (const f of files) urls.push(await uploadFile(f, "products"));
  return urls;
}

const toInt = (v: FormDataEntryValue | null) => parseInt(((v as string) || "0").replace(/\D/g, ""), 10) || 0;

/** Percent discount → a discounted price, rounded to the nearest 500. */
const applyPct = (harga: number, pct: number) =>
  pct > 0 && pct < 100 ? Math.round((harga * (1 - pct / 100)) / 500) * 500 : null;

function parseData(formData: FormData) {
  const nama = ((formData.get("nama") as string) || "").trim();
  const kategori = ((formData.get("kategori") as string) || "").trim();
  const harga = toInt(formData.get("harga"));
  const diskonPersen = Math.min(90, Math.max(0, toInt(formData.get("diskonPersen"))));
  return {
    nama,
    kategori,
    harga,
    berat: toInt(formData.get("berat")) || 500, // gram; default 500 utk hitung ongkir
    diskonPersen,
    hargaDiskon: applyPct(harga, diskonPersen), // no-variant products use this directly
    brand: ((formData.get("brand") as string) || "").trim() || null,
    deskripsi: ((formData.get("deskripsi") as string) || "").trim() || null,
    ukuran: formData.getAll("ukuran").map(String),
    status: (formData.get("status") as string) === "SOLD" ? ("SOLD" as const) : ("READY" as const),
    stok: parseStok(formData.get("stok")), // non-varian: null = tak terbatas, angka = jumlah stok
  };
}

/** Stok produk non-varian: kosong → null (tak terbatas), selain itu angka ≥ 0. */
function parseStok(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? "").trim();
  if (s === "") return null;
  return Math.max(0, parseInt(s.replace(/\D/g, ""), 10) || 0);
}

type VariantInput = { warna: string; ukuran: string; harga: number; hargaDiskon: number | null; stok: number; gambar: string | null; urutan: number };

/** Parse the variant rows from the form (aligned arrays) and upload any new per-row photos.
 *  A row needs a warna + harga to count; blank rows are skipped.
 *  `pct` is the product-wide percent discount; a row's own discount price overrides it. */
async function parseVariants(formData: FormData, pct: number): Promise<VariantInput[]> {
  const warna = formData.getAll("v_warna").map(String);
  const ukuran = formData.getAll("v_ukuran").map(String);
  const harga = formData.getAll("v_harga").map(String);
  const diskon = formData.getAll("v_diskonpersen").map(String);
  const stok = formData.getAll("v_stok").map(String);
  const existing = formData.getAll("v_existingGambar").map(String);
  const files = formData.getAll("v_gambar");

  const out: VariantInput[] = [];
  for (let i = 0; i < warna.length; i++) {
    const w = (warna[i] || "").trim();
    const h = parseInt((harga[i] || "0").replace(/\D/g, ""), 10) || 0;
    if (!w || h <= 0) continue; // skip incomplete rows
    const f = files[i];
    let gambar: string | null = (existing[i] || "") || null;
    if (f instanceof File && f.size > 0) {
      if (!storageConfigured) throw new Error("Supabase Storage belum dikonfigurasi (cek .env).");
      gambar = await uploadFile(f, "products");
    }
    const vp = Math.min(90, Math.max(0, parseInt((diskon[i] || "0").replace(/\D/g, ""), 10) || 0));
    out.push({
      warna: w,
      ukuran: (ukuran[i] || "").trim(),
      harga: h,
      hargaDiskon: applyPct(h, vp > 0 ? vp : pct), // row % override, else product-wide %
      stok: parseInt((stok[i] || "0").replace(/\D/g, ""), 10) || 0,
      gambar,
      urutan: i,
    });
  }
  return out;
}

/** The product's headline price: the variant with the lowest effective price (discount if any),
 *  so shop sort/filter + Best Deal use the real cheapest. Else the product's own fields. */
function headlinePrice(variants: VariantInput[], data: { harga: number; hargaDiskon: number | null }) {
  if (!variants.length) return { harga: data.harga, hargaDiskon: data.hargaDiskon };
  const eff = (v: VariantInput) => v.hargaDiskon ?? v.harga;
  const cheapest = variants.reduce((a, b) => (eff(b) < eff(a) ? b : a));
  return { harga: cheapest.harga, hargaDiskon: cheapest.hargaDiskon };
}

/** Resolve the size chart: a newly uploaded file wins, else the existing/imported URL. */
async function resolveSizeChart(formData: FormData): Promise<string | null> {
  const file = formData.get("sizeChartFile");
  if (file instanceof File && file.size > 0) {
    if (!storageConfigured) throw new Error("Supabase Storage belum dikonfigurasi (cek .env).");
    return uploadFile(file, "sizecharts");
  }
  return ((formData.get("sizeChartUrl") as string) || "") || null;
}

export async function createProduct(formData: FormData) {
  requireSection("produk");
  const data = parseData(formData);
  if (!data.nama || !data.kategori) throw new Error("Nama dan kategori wajib diisi.");
  const existing = formData.getAll("existingGambar").map(String);
  const uploaded = await uploadImages(formData);
  const sizeChart = await resolveSizeChart(formData);
  const variants = await parseVariants(formData, data.diskonPersen);
  const headline = headlinePrice(variants, data);
  await prisma.product.create({
    data: { ...data, ...headline, stok: variants.length ? null : data.stok, gambar: [...existing, ...uploaded], sizeChart, variants: { create: variants } },
  });
  revalidatePublic();
  redirect("/dashboard");
}

export type ImportResult = {
  nama: string;
  harga: number;
  berat: number;
  brand: string | null;
  kategori: string;
  deskripsi: string | null;
  ukuran: string[];
  gambar: string[];
  sizeChart: string | null;
  variants: { warna: string; ukuran: string; harga: number; stok: number; gambar: string | null }[];
};

/** Import one product from a Tokopedia link: parse fields + re-host its images to Supabase.
 *  Returns `{ error }` on failure so the message survives Next.js production error masking. */
export async function importFromTokopedia(url: string): Promise<ImportResult | { error: string }> {
  requireSection("produk");
  let p;
  try {
    p = await fetchTokopedia(url);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal impor dari Tokopedia." };
  }
  const gambar: string[] = [];
  let sizeChart: string | null = null;
  if (storageConfigured) {
    for (const img of p.images) {
      try {
        gambar.push(await uploadFromUrl(img, "products"));
      } catch {
        /* skip a failed image, keep the rest */
      }
    }
    if (p.sizeChart) {
      try {
        sizeChart = await uploadFromUrl(p.sizeChart, "sizecharts");
      } catch {
        /* size chart optional */
      }
    }
  }

  // Re-host each colour's photo once, then map it onto every variant of that colour.
  const colorPhoto: Record<string, string | null> = {};
  if (storageConfigured) {
    for (const v of p.variants) {
      const key = v.warna.toLowerCase();
      if (v.gambarUrl && !(key in colorPhoto)) {
        try {
          colorPhoto[key] = await uploadFromUrl(v.gambarUrl, "products");
        } catch {
          colorPhoto[key] = null;
        }
      }
    }
  }
  const variants = p.variants.map((v) => ({
    warna: v.warna,
    ukuran: v.ukuran,
    harga: v.harga,
    stok: v.stok,
    gambar: colorPhoto[v.warna.toLowerCase()] ?? null,
  }));

  return {
    nama: p.nama,
    harga: p.harga,
    berat: p.berat,
    brand: p.brand,
    kategori: p.kategori,
    deskripsi: p.deskripsi,
    ukuran: p.ukuran,
    gambar,
    sizeChart,
    variants,
  };
}

export async function updateProduct(id: string, formData: FormData) {
  requireSection("produk");
  const data = parseData(formData);
  if (!data.nama || !data.kategori) throw new Error("Nama dan kategori wajib diisi.");
  const existing = formData.getAll("existingGambar").map(String);
  const uploaded = await uploadImages(formData);
  const sizeChart = await resolveSizeChart(formData);
  const variants = await parseVariants(formData, data.diskonPersen);
  const headline = headlinePrice(variants, data);
  await prisma.product.update({
    where: { id },
    data: {
      ...data,
      ...headline,
      stok: variants.length ? null : data.stok,
      gambar: [...existing, ...uploaded],
      sizeChart,
      variants: { deleteMany: {}, create: variants }, // replace the whole set
    },
  });
  revalidatePublic(id);
  redirect("/dashboard");
}

export async function deleteProduct(id: string) {
  requireSection("produk");
  await prisma.product.delete({ where: { id } });
  revalidatePublic(id);
}

export async function setStatus(id: string, status: "READY" | "SOLD") {
  requireSection("produk");
  await prisma.product.update({ where: { id }, data: { status } });
  revalidatePublic(id);
}

export async function createHeroSlide(formData: FormData) {
  requireSection("hero");
  const file = formData.get("gambar");
  if (!(file instanceof File) || file.size === 0) throw new Error("Pilih gambar dulu.");
  const mobileFile = formData.get("gambarMobile");
  const url = await uploadFile(file, "hero");
  const mobileUrl =
    mobileFile instanceof File && mobileFile.size > 0 ? await uploadFile(mobileFile, "hero") : null;
  await prisma.heroSlide.create({
    data: {
      gambar: url,
      gambarMobile: mobileUrl,
      link: ((formData.get("link") as string) || "").trim() || null,
      urutan: parseInt((formData.get("urutan") as string) || "0", 10) || 0,
    },
  });
  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function deleteHeroSlide(id: string) {
  requireSection("hero");
  await prisma.heroSlide.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/dashboard");
}

// ---------- Our Store (cabang) ----------

export async function createStore(formData: FormData) {
  requireSection("store");
  const nama = ((formData.get("nama") as string) || "").trim();
  const alamat = ((formData.get("alamat") as string) || "").trim();
  if (!nama || !alamat) throw new Error("Nama & alamat store wajib diisi.");
  const foto = await uploadOneImage(formData, "stores"); // pakai input name="gambar"
  await prisma.store.create({
    data: {
      nama,
      alamat,
      jam: ((formData.get("jam") as string) || "").trim() || null,
      maps: ((formData.get("maps") as string) || "").trim() || null,
      foto,
      urutan: parseInt((formData.get("urutan") as string) || "0", 10) || 0,
    },
  });
  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function deleteStore(id: string) {
  requireSection("store");
  await prisma.store.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/dashboard");
}

// ---------- Brand Popular (carousel landing → filter shop) ----------

export async function createPopularBrand(formData: FormData) {
  requireSection("brand");
  const nama = ((formData.get("nama") as string) || "").trim();
  if (!nama) throw new Error("Nama brand wajib diisi.");
  const foto = await uploadOneImage(formData, "brands"); // input name="gambar"
  if (!foto) throw new Error("Pilih foto brand dulu.");
  await prisma.popularBrand.create({
    data: { nama, foto, urutan: parseInt((formData.get("urutan") as string) || "0", 10) || 0 },
  });
  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function deletePopularBrand(id: string) {
  requireSection("brand");
  await prisma.popularBrand.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/dashboard");
}

// ---------- Articles ----------

function revalidateArticles(id?: string) {
  revalidatePath("/");
  revalidatePath("/articles");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/articles/${id}`);
}

function parseArticle(formData: FormData) {
  const judul = ((formData.get("judul") as string) || "").trim();
  const konten = ((formData.get("konten") as string) || "").trim();
  const tglRaw = (formData.get("tanggal") as string) || "";
  return {
    judul,
    konten,
    tag: ((formData.get("tag") as string) || "").trim() || null,
    penulis: ((formData.get("penulis") as string) || "").trim() || "admin",
    excerpt: ((formData.get("excerpt") as string) || "").trim() || null,
    tanggal: tglRaw ? new Date(tglRaw) : new Date(),
  };
}

/** Upload a single optional image under `name="gambar"`; null if none picked. */
async function uploadOneImage(formData: FormData, folder: string): Promise<string | null> {
  const file = formData.get("gambar");
  if (!(file instanceof File) || file.size === 0) return null;
  if (!storageConfigured) throw new Error("Supabase Storage belum dikonfigurasi (cek .env).");
  return uploadFile(file, folder);
}

export async function createArticle(formData: FormData) {
  requireSection("artikel");
  const data = parseArticle(formData);
  if (!data.judul || !data.konten) throw new Error("Judul dan konten wajib diisi.");
  const gambar = await uploadOneImage(formData, "articles");
  const slug = await uniqueArticleSlug(data.judul);
  await prisma.article.create({ data: { ...data, slug, gambar } });
  revalidateArticles();
  redirect("/dashboard");
}

export async function updateArticle(id: string, formData: FormData) {
  requireSection("artikel");
  const data = parseArticle(formData);
  if (!data.judul || !data.konten) throw new Error("Judul dan konten wajib diisi.");
  const uploaded = await uploadOneImage(formData, "articles");
  const existing = ((formData.get("existingGambar") as string) || "") || null;
  // Slug tetap stabil (jaga SEO/link lama); hanya diisi kalau artikel belum punya.
  const cur = await prisma.article.findUnique({ where: { id }, select: { slug: true } });
  const slug = cur?.slug ?? (await uniqueArticleSlug(data.judul, id));
  await prisma.article.update({ where: { id }, data: { ...data, slug, gambar: uploaded ?? existing } });
  revalidateArticles(id);
  redirect("/dashboard");
}

export async function deleteArticle(id: string) {
  requireSection("artikel");
  await prisma.article.delete({ where: { id } });
  revalidateArticles(id);
}

export async function deleteSponsorship(id: string) {
  requireSection("sponsor");
  await prisma.sponsorshipSubmission.delete({ where: { id } });
  revalidatePath("/dashboard");
}

// ---------- Orders (admin) ----------

function revalidateOrder(id: string) {
  revalidatePath("/dashboard/orders");
  revalidatePath(`/order/${id}`);
}

/** Konfirmasi pembayaran manual (transfer) — sama efeknya dgn webhook DOKU:
 *  potong stok + kirim event "paid" ke n8n. */
export async function adminMarkPaid(id: string) {
  requireSection("pesanan");
  await markOrderPaid(id, { metodeBayar: "Manual" });
  revalidateOrder(id);
}

/** Simpan nomor resi → status DIKIRIM → kirim event "shipped" ke n8n (WA resi ke customer). */
export async function adminMarkShipped(id: string, resi: string, kurir?: string) {
  requireSection("pesanan");
  await markOrderShipped(id, resi, kurir);
  revalidateOrder(id);
}

/** Tandai pesanan sudah diterima customer → status DELIVERED (customer bisa menilai). */
export async function adminMarkDelivered(id: string) {
  requireSection("pesanan");
  await markOrderDelivered(id);
  revalidateOrder(id);
}

export async function adminCancelOrder(id: string) {
  requireSection("pesanan");
  await cancelOrder(id);
  revalidateOrder(id);
}

/** Hapus permanen pesanan yang sudah selesai (Batal / Diterima). Item & review
 *  ikut terhapus (cascade). Tidak boleh menghapus pesanan yang masih berjalan. */
export async function adminDeleteOrder(id: string) {
  requireSection("pesanan");
  const o = await prisma.order.findUnique({ where: { id }, select: { status: true } });
  if (!o || (o.status !== "CANCELLED" && o.status !== "DELIVERED")) return;
  await prisma.order.delete({ where: { id } });
  revalidatePath("/dashboard/orders");
}

// ── Kupon ──────────────────────────────────────────────────────────────────
export type CouponState = { error?: string; ok?: boolean };

/** Buat kupon. scope "products" → simpan daftar productIds; "all" → kosong (semua produk). */
export async function createCoupon(_prev: CouponState, formData: FormData): Promise<CouponState> {
  requireSection("kupon");
  const code = ((formData.get("code") as string) || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9]{3,20}$/.test(code)) return { error: "Kode kupon 3-20 karakter, huruf/angka saja." };

  const value = Math.min(100, Math.max(1, toInt(formData.get("value"))));
  if (value <= 0) return { error: "Persen potongan harus 1-100." };

  const scoped = (formData.get("scope") as string) === "products";
  const productIds = scoped ? formData.getAll("productIds").map(String).filter(Boolean) : [];
  if (scoped && productIds.length === 0) return { error: "Pilih minimal satu produk untuk kupon produk tertentu." };

  const exists = await prisma.coupon.findUnique({ where: { code } });
  if (exists) return { error: `Kupon "${code}" sudah ada.` };

  await prisma.coupon.create({ data: { code, value, productIds } });
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteCoupon(id: string) {
  requireSection("kupon");
  await prisma.coupon.delete({ where: { id } });
  revalidatePath("/dashboard");
}

export async function toggleCoupon(id: string) {
  requireSection("kupon");
  const c = await prisma.coupon.findUnique({ where: { id } });
  if (c) await prisma.coupon.update({ where: { id }, data: { active: !c.active } });
  revalidatePath("/dashboard");
}

// ── Ganti kata sandi (role sendiri) ─────────────────────────────────────────
export type PasswordState = { error?: string; ok?: boolean };

export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const role = currentRole();
  if (!role) return { error: "Sesi berakhir. Login ulang." };
  const lama = (formData.get("lama") as string) || "";
  const baru = (formData.get("baru") as string) || "";
  const konfirmasi = (formData.get("konfirmasi") as string) || "";
  if (baru.length < 6) return { error: "Kata sandi baru minimal 6 karakter." };
  if (baru !== konfirmasi) return { error: "Konfirmasi kata sandi tidak cocok." };
  if (!(await roleMatches(role.key, lama))) return { error: "Kata sandi lama salah." };
  await setRolePassword(role.key, baru);
  return { ok: true };
}

// ──────────────── Event Demo: Kampanye & Klaim (admin) ────────────────

export async function createCampaign(formData: FormData) {
  requireSection("event");
  const brand = ((formData.get("brand") as string) || "").trim();
  const productType = ((formData.get("productType") as string) || "").trim();
  const title = ((formData.get("title") as string) || "").trim();
  const description = ((formData.get("description") as string) || "").trim();
  if (!brand || !title || !productType) throw new Error("Brand, judul, dan jenis produk wajib diisi.");
  const banner = await uploadOneImage(formData, "events"); // input name="gambar"
  // Periode (startDate/endDate) diisi nanti saat ACC brand.
  await prisma.demoCampaign.create({
    data: { brand, productType, title, description, banner },
  });
  revalidatePath("/dashboard/event");
  revalidatePath("/event");
  redirect("/dashboard/event");
}

/** Edit isi kampanye (brand/produk/judul/deskripsi, banner & periode opsional). */
export async function updateCampaign(formData: FormData) {
  requireSection("event");
  const id = ((formData.get("id") as string) || "").trim();
  const brand = ((formData.get("brand") as string) || "").trim();
  const productType = ((formData.get("productType") as string) || "").trim();
  const title = ((formData.get("title") as string) || "").trim();
  const description = ((formData.get("description") as string) || "").trim();
  if (!id) throw new Error("Kampanye tidak ditemukan.");
  if (!brand || !title || !productType) throw new Error("Brand, judul, dan jenis produk wajib diisi.");
  const startRaw = (formData.get("startDate") as string) || "";
  const endRaw = (formData.get("endDate") as string) || "";
  const data: Record<string, unknown> = { brand, productType, title, description };
  const banner = await uploadOneImage(formData, "events"); // null kalau tak ganti
  if (banner) data.banner = banner;
  if (startRaw && endRaw) {
    if (endRaw < startRaw) throw new Error("Periode selesai harus setelah mulai.");
    data.startDate = new Date(startRaw);
    data.endDate = new Date(endRaw);
  }
  await prisma.demoCampaign.update({ where: { id }, data });
  revalidatePath("/dashboard/event");
  revalidatePath("/event");
}

export async function toggleCampaign(id: string) {
  requireSection("event");
  const c = await prisma.demoCampaign.findUnique({ where: { id }, select: { isActive: true } });
  if (c) await prisma.demoCampaign.update({ where: { id }, data: { isActive: !c.isActive } });
  revalidatePath("/dashboard/event");
  revalidatePath("/event");
}

export async function deleteCampaign(id: string) {
  requireSection("event");
  await prisma.demoCampaign.delete({ where: { id } });
  revalidatePath("/dashboard/event");
  revalidatePath("/event");
}

/** ACC brand: pindahkan kampanye dari "Coming soon" (rencana) ke "Now" (siap diklaim), atau sebaliknya. */
/** ACC brand: set periode (mulai–selesai) lalu tandai brandApproved → masuk "Now" (siap diklaim). */
export async function approveCampaign(formData: FormData) {
  requireSection("event");
  const id = ((formData.get("id") as string) || "").trim();
  const startRaw = (formData.get("startDate") as string) || "";
  const endRaw = (formData.get("endDate") as string) || "";
  if (!startRaw || !endRaw) throw new Error("Periode mulai & selesai wajib diisi.");
  if (endRaw < startRaw) throw new Error("Periode selesai harus setelah mulai.");
  await prisma.demoCampaign.update({
    where: { id },
    data: { brandApproved: true, startDate: new Date(startRaw), endDate: new Date(endRaw) },
  });
  revalidatePath("/dashboard/event");
  revalidatePath("/event");
}

/** Batal ACC: kembalikan ke "Coming soon" (periode tetap tersimpan untuk ACC ulang). */
export async function unapproveCampaign(id: string) {
  requireSection("event");
  await prisma.demoCampaign.update({ where: { id }, data: { brandApproved: false } });
  revalidatePath("/dashboard/event");
  revalidatePath("/event");
}

/** ACC / tolak akun komunitas baru. ACC → buat password & kirim akses via WA. */
export async function decideCommunity(id: string, decision: "accepted" | "rejected") {
  requireSection("event");
  const c = await prisma.community.findUnique({ where: { id } });
  if (!c || c.status !== "pending") return;

  if (decision === "accepted") {
    const password = `${c.instagram}${Math.floor(100 + Math.random() * 900)}`;
    const { count } = await prisma.community.updateMany({ where: { id, status: "pending" }, data: { status: "accepted", passwordHash: hashPassword(password) } });
    if (!count) return; // sudah diputuskan request lain (klik dobel)
    await sendWa(
      c.waPhone,
      `✅ *Akun komunitas ${c.name} disetujui!*\n\n*Akses login:*\nPassword: ${password}\n\nLogin di tirtonic.com/komunitas untuk klaim demo produk brand. Cukup pakai password ini. 🎾`,
    );
  } else {
    const { count } = await prisma.community.updateMany({ where: { id, status: "pending" }, data: { status: "rejected" } });
    if (!count) return;
    await sendWa(c.waPhone, `Mohon maaf, pendaftaran komunitas *${c.name}* belum bisa kami setujui saat ini. 🙏`);
  }
  revalidatePath("/dashboard/event");
}

/** Tandai produk demo sudah diambil komunitas (dipanggil saat admin scan QR). */
export async function markPickedUp(token: string) {
  requireSection("event");
  const claimId = verifyPickupToken(token);
  if (!claimId) return;
  // updateMany + pickedUpAt null → idempoten, pertahankan waktu ambil pertama.
  await prisma.demoClaim.updateMany({ where: { id: claimId, pickedUpAt: null }, data: { pickedUpAt: new Date() } });
  revalidatePath("/dashboard/event");
  revalidatePath("/komunitas");
}

/** Tandai produk demo sudah dikembalikan ke toko (dipanggil saat admin scan QR). */
export async function markReturned(token: string) {
  requireSection("event");
  const claimId = verifyReturnToken(token);
  if (!claimId) return;
  // idempoten; pertahankan waktu kembali pertama.
  await prisma.demoClaim.updateMany({ where: { id: claimId, returnedAt: null }, data: { returnedAt: new Date() } });
  revalidatePath("/dashboard/event");
  revalidatePath("/komunitas");
}

/** Hapus 1 pengajuan/klaim demo (cascade: peserta ikut terhapus). */
export async function deleteClaim(id: string) {
  requireSection("event");
  await prisma.demoClaim.delete({ where: { id } }).catch(() => {});
  revalidatePath("/dashboard/event");
  revalidatePath("/event");
  revalidatePath("/komunitas");
}

/** Admin toko masuk sebagai komunitas (bantu klaim demo dll). Cuma akun yang sudah di-ACC. */
export async function loginAsCommunity(id: string) {
  requireSection("event");
  const c = await prisma.community.findUnique({ where: { id }, select: { status: true } });
  if (c?.status !== "accepted") return;
  createCommunitySession(id);
  redirect("/komunitas");
}

/** Hapus akun komunitas (cascade: klaim demo & peserta ikut terhapus). */
export async function deleteCommunity(id: string) {
  requireSection("event");
  await prisma.community.delete({ where: { id } }).catch(() => {});
  revalidatePath("/dashboard/event");
  revalidatePath("/event");
}

/** ACC / tolak klaim demo komunitas → kirim WA ke penanggung jawab acara. */
export async function decideClaim(id: string, decision: "accepted" | "rejected") {
  requireSection("event");
  // Status sudah sama → klik dobel, jangan kirim WA lagi.
  const { count } = await prisma.demoClaim.updateMany({ where: { id, status: { not: decision } }, data: { status: decision } });
  if (!count) return;
  const claim = await prisma.demoClaim.findUniqueOrThrow({
    where: { id },
    include: { campaign: { select: { brand: true, title: true } }, community: { select: { name: true } } },
  });
  const tgl = claim.demoDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const msg =
    decision === "accepted"
      ? `✅ *Demo DITERIMA!*\n\nAcara demo ${claim.campaign.brand} — ${claim.campaign.title}\nKomunitas: ${claim.community.name}\nLapangan: ${claim.court}\nTanggal: ${tgl}\n\nAcara sudah masuk ke dashboard komunitas & tampil di halaman Event Tirtonic. Siap-siap ya! 🎾`
      : `❌ *Demo belum bisa kami terima*\n\nPengajuan demo ${claim.campaign.brand} (${claim.community.name}) untuk ${tgl} belum bisa kami proses kali ini. Silakan hubungi admin Tirtonic untuk info lebih lanjut. Terima kasih 🙏`;
  await sendWa(claim.eventPicPhone, msg);
  revalidatePath("/dashboard/event");
  revalidatePath("/event");
  revalidatePath("/komunitas");
}
