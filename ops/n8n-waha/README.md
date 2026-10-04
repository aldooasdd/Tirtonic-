# Otomasi Tirtonic — n8n + WAHA (Docker)

Kirim WA + email otomatis ke customer saat **pesanan LUNAS** dan saat **resi diisi**.
Web (di Vercel) hanya mem-POST data ke webhook n8n; n8n yang kirim WA (lewat WAHA) + email.

```
Web Tirtonic ──POST──▶ n8n (workflow) ──▶ WAHA ──▶ WhatsApp customer
                                      └──▶ SMTP ──▶ Email customer
```

## Yang perlu disiapkan
- **VPS** (mis. 2GB RAM, Ubuntu) dengan **Docker** + **Docker Compose**.
- **2 subdomain** diarahkan (A record) ke IP VPS: `n8n.tirtonic.com` & `waha.tirtonic.com`.
- **1 nomor WhatsApp** khusus buat kirim notif (sebaiknya bukan nomor pribadi — WAHA pakai WhatsApp Web, idealnya nomor terpisah).
- Akun **SMTP** buat email (Gmail app-password / Zoho / dsb).

## Langkah
1. **Install Docker** di VPS:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
2. **Salin folder ini** ke VPS, lalu:
   ```bash
   cp .env.example .env
   # isi N8N_HOST, WAHA_HOST, N8N_ENCRYPTION_KEY (openssl rand -hex 24), WAHA_API_KEY, dll
   ```
3. **Pastikan DNS** `n8n.*` & `waha.*` sudah mengarah ke IP VPS (cek: `ping n8n.tirtonic.com`).
4. **Jalankan**:
   ```bash
   docker compose up -d
   ```
   Caddy otomatis ambil sertifikat HTTPS (butuh port 80/443 terbuka).
5. **Sambungkan WhatsApp**: buka `https://waha.tirtonic.com/dashboard` → login (user/pass dari `.env`)
   → start session `default` → **scan QR** pakai WhatsApp nomor notif.
6. **Setup n8n**: buka `https://n8n.tirtonic.com` → buat akun owner.
   - Menu **Import from File** → pilih `n8n-workflow.json`.
   - Node **Kirim Email (SMTP)** → isi kredensial SMTP (host, port, user, pass, from).
   - Node **Kirim WhatsApp (WAHA)** → header `X-Api-Key` sudah pakai `{{ $env.WAHA_API_KEY }}`
     (sama dgn `.env`). Kalau mau, ganti ke nilai literal.
   - **Aktifkan** workflow (toggle Active). Buka node Webhook → salin **Production URL**
     (bentuknya `https://n8n.tirtonic.com/webhook/tirtonic-order`).
7. **Sambungkan ke web** — di Vercel (project web Tirtonic) set env, lalu redeploy:
   ```
   N8N_ORDER_PAID_URL=https://n8n.tirtonic.com/webhook/tirtonic-order
   N8N_ORDER_SHIPPED_URL=https://n8n.tirtonic.com/webhook/tirtonic-order
   ```
   (Workflow ini bedakan paid vs shipped dari field `event`, jadi **satu URL untuk keduanya**.)

## Tes cepat
Tandai sebuah pesanan **Lunas** di dashboard web (atau isi **resi**) → customer harusnya
terima WA + email. Kalau belum masuk: cek **Executions** di n8n (lihat error per node).

## Catatan
- WAHA core = **1 sesi/1 nomor** (cukup untuk kirim notif). Butuh banyak nomor → WAHA Plus.
- Sesi WhatsApp tersimpan di volume `waha_sessions` (tidak perlu scan ulang tiap restart).
- Update versi: `docker compose pull && docker compose up -d`.
- `.env` berisi rahasia — jangan commit (sudah di-.gitignore).
- Format pesan WA/email bisa diedit di node **Siapkan Pesan** (JavaScript).
