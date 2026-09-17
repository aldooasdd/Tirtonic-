import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client for uploading to Storage (service role key).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "tirtonic";

export const storageConfigured = Boolean(url && key);

const client = storageConfigured ? createClient(url!, key!) : null;

/** Uploads a File to the public bucket and returns its public URL. */
export async function uploadFile(file: File, folder: string): Promise<string> {
  if (!client) throw new Error("Supabase Storage belum dikonfigurasi (cek .env).");
  const ext = file.name.split(".").pop() || "bin";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await client.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Upload gagal: ${error.message}`);
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Downloads an external image URL and re-uploads it to the bucket; returns public URL. */
export async function uploadFromUrl(url: string, folder: string): Promise<string> {
  if (!client) throw new Error("Supabase Storage belum dikonfigurasi (cek .env).");
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Gagal unduh gambar (HTTP ${res.status})`);
  const type = res.headers.get("content-type") || "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = (type.split("/")[1] || "jpg").split(";")[0];
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await client.storage.from(bucket).upload(path, buf, { contentType: type, upsert: false });
  if (error) throw new Error(`Upload gagal: ${error.message}`);
  return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
