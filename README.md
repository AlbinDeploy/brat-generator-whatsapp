# Brat Generator - Next.js

Generator brat-style sederhana yang siap deploy ke Vercel.

## Fitur

- Next.js App Router
- Mode: white, green, strike, mirror, random animated
- Export PNG
- Export WEBP
- Export WEBM untuk mode random
- Share file ke WhatsApp / app lain via Web Share API jika device support

## Jalankan lokal

```bash
npm install
npm run dev
```

## Deploy ke Vercel

1. Push ke GitHub
2. Import project ke Vercel
3. Deploy tanpa konfigurasi tambahan

## Catatan penting

- Website bisa membuat asset sticker-ready, tapi tidak bisa memaksa WhatsApp untuk langsung menambahkan file ke panel sticker dari browser.
- Tombol share akan membuka native share sheet bila browser dan device mendukung.
- Untuk pengalaman terbaik, pakai HTTPS dan browser mobile modern.
