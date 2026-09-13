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
