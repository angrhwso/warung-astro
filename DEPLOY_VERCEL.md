# Panduan Deploy Warung Astro ke Vercel Free Tier

Panduan ini untuk aplikasi Astro + React + Supabase + Midtrans QRIS yang memakai adapter Vercel.

## 1. Persiapan Sebelum Deploy

Pastikan file berikut ada di root project:

- `vercel.json`
- `package.json`
- `.env` untuk konfigurasi lokal

Pastikan `package.json` memiliki script berikut:

```json
{
  "scripts": {
    "build": "astro build",
    "dev": "astro dev",
    "preview": "astro preview"
  }
}
```

Pastikan `astro.config.mjs` sudah memakai adapter Vercel:

```js
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import vercel from '@astrojs/vercel'

export default defineConfig({
  integrations: [react()],
  output: 'server',
  adapter: vercel(),
})
```

## 2. Environment Variables

Gunakan `.env` lokal sebagai acuan, lalu salin nilainya ke Vercel Environment Variables:

```env
PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
MIDTRANS_SERVER_KEY=your-midtrans-server-key
NODE_ENV=development
```

Keterangan:

- `PUBLIC_SUPABASE_URL`: URL project Supabase.
- `PUBLIC_SUPABASE_ANON_KEY`: anon key Supabase untuk client/browser.
- `SUPABASE_SERVICE_ROLE_KEY`: service role key untuk API server, upload image, payment status, webhook, dan report.
- `MIDTRANS_SERVER_KEY`: server key Midtrans untuk membuat transaksi QRIS dan verifikasi webhook.

Jangan commit file `.env` asli.

## 3. Setup Supabase

1. Buka dashboard Supabase.
2. Buat project baru atau gunakan project yang sudah ada.
3. Buka `SQL Editor`.
4. Jalankan migration secara berurutan:

```text
supabase/migrations/001_init.sql
supabase/migrations/002_constraints.sql
```

5. Buka `Storage`.
6. Buat bucket:

```text
menu-images
```

7. Set bucket menjadi public jika gambar menu ingin langsung bisa diakses.
8. Buka `Authentication > Users`.
9. Buat satu user admin dengan email dan password.

Alternatif lokal:

```bash
node scripts/create-admin.js admin@email.com PasswordAdmin123!
```

## 4. Setup Midtrans

1. Buka dashboard Midtrans.
2. Ambil `Server Key`.
3. Simpan sebagai `MIDTRANS_SERVER_KEY` di Vercel.
4. Setelah deploy berhasil, set webhook notification URL:

```text
https://domain-kamu.vercel.app/api/midtrans/webhook
```

Untuk production domain custom:

```text
https://domain-kamu.com/api/midtrans/webhook
```

## 5. Deploy ke Vercel dari GitHub

1. Push project ke GitHub.
2. Buka Vercel dashboard.
3. Klik `Add New Project`.
4. Import repository project ini.
5. Pada bagian framework, pilih atau biarkan auto-detect:

```text
Astro
```

6. Build command:

```bash
npm run build
```

7. Output directory:

```text
dist
```

8. Tambahkan environment variables:

```text
PUBLIC_SUPABASE_URL
PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
MIDTRANS_SERVER_KEY
```

9. Klik `Deploy`.

## 6. Deploy via Vercel CLI

Install Vercel CLI:

```bash
npm install -g vercel
```

Login:

```bash
vercel login
```

Deploy preview:

```bash
vercel
```

Deploy production:

```bash
vercel --prod
```

Set env lewat CLI:

```bash
vercel env add PUBLIC_SUPABASE_URL
vercel env add PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add MIDTRANS_SERVER_KEY
```

## 7. Konfigurasi Vercel Secrets Legacy

File `vercel.json` memakai format reference:

```json
{
  "env": {
    "PUBLIC_SUPABASE_URL": "@supabase_url",
    "PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase_service_role",
    "MIDTRANS_SERVER_KEY": "@midtrans_server_key"
  }
}
```

Jika memakai Vercel dashboard modern, kamu bisa langsung isi environment variables dengan nama asli tanpa membuat secret alias.

Jika ingin memakai secret alias via CLI:

```bash
vercel secrets add supabase_url "https://your-project-ref.supabase.co"
vercel secrets add supabase_anon_key "your-anon-key"
vercel secrets add supabase_service_role "your-service-role-key"
vercel secrets add midtrans_server_key "your-midtrans-server-key"
```

## 8. Checklist Setelah Deploy

Cek halaman berikut:

- `/` untuk katalog publik.
- `/meja/1` untuk QR meja.
- `/admin/login` untuk login admin.
- `/admin/dashboard` untuk ringkasan admin.
- `/admin/menu` untuk CRUD menu dan upload gambar.
- `/admin/orders` untuk update status pesanan.
- `/admin/reports` untuk export CSV.
- `/api/midtrans/webhook` untuk endpoint webhook Midtrans.

Uji alur utama:

1. Tambah kategori dan menu di admin.
2. Buka katalog publik.
3. Tambah item ke keranjang.
4. Checkout QRIS.
5. Pastikan data masuk ke tabel `pesanan`, `detail_pesanan`, dan `pembayaran`.
6. Simulasikan pembayaran atau tunggu callback Midtrans.
7. Pastikan status berubah ke `diproses`.
8. Pastikan stok menu berkurang otomatis.

## 9. Troubleshooting

Jika build gagal karena adapter:

```bash
npm install @astrojs/vercel
```

Jika API route tidak jalan, pastikan:

- `output: 'server'` ada di `astro.config.mjs`.
- `adapter: vercel()` ada di `astro.config.mjs`.
- Env vars sudah diset di Vercel.

Jika upload gambar gagal, cek:

- Bucket `menu-images` sudah ada.
- `SUPABASE_SERVICE_ROLE_KEY` benar.
- Storage policy/bucket public sudah sesuai.

Jika checkout QRIS gagal, cek:

- `MIDTRANS_SERVER_KEY` benar.
- Mode Midtrans sandbox/production sesuai.
- Gross amount berupa integer rupiah.

Jika webhook tidak update status, cek:

- URL webhook sudah mengarah ke `/api/midtrans/webhook`.
- `MIDTRANS_SERVER_KEY` di Vercel sama dengan dashboard Midtrans.
- Log function di Vercel untuk melihat payload/error.

## 10. Catatan Free Tier

Vercel free tier cukup untuk aplikasi kecil, tetapi perhatikan:

- Serverless function punya timeout.
- Cold start bisa terjadi.
- Storage gambar tetap di Supabase, bukan Vercel.
- Jangan pakai service role key di browser.
- Pastikan semua API sensitif memakai server route.
