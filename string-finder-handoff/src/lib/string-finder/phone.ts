// Normalisasi nomor WhatsApp Indonesia ke format 62xxxxxxxxxx.
// Terima: 08xx, 8xx, +62xx, 62xx, dengan spasi/strip. Null kalau tidak valid.
export function normalizePhone(input: string): string | null {
  const digits = (input || "").replace(/[^\d]/g, "");
  if (!digits) return null;
  let n = digits;
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (n.startsWith("8")) n = "62" + n;
  else if (n.startsWith("620")) n = "62" + n.slice(3);
  // sekarang harus mulai 62 dan diikuti 8...
  if (!n.startsWith("62")) return null;
  const rest = n.slice(2);
  if (!rest.startsWith("8")) return null;
  if (rest.length < 8 || rest.length > 13) return null; // panjang wajar
  return n;
}

// Format tampilan: 0812-3456-7890 dari 62812...
export function displayPhone(n: string): string {
  if (n.startsWith("62")) return "0" + n.slice(2);
  return n;
}
