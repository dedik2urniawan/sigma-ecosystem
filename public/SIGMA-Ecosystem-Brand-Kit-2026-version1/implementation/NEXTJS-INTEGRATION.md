# Integrasi Next.js App Router

## 1. Salin aset

Salin isi `drop-in/public/` ke `public/` proyek. Jalur publik yang dipakai komponen:

| Kebutuhan | URL publik |
|---|---|
| Logo utama | `/brand/sigma/logo-sigma-horizontal-primary.png` |
| Logo putih | `/brand/sigma/logo-sigma-horizontal-white.png` |
| Logo gelap | `/brand/sigma/logo-sigma-horizontal-dark.png` |
| Mark | `/brand/sigma/logo-sigma-mark-primary.png` |
| Ikon PWA | `/icons/icon-192x192.png`, `/icons/icon-512x512.png` |
| Maskable | `/icons/icon-maskable-512x512.png` |
| Apple icon | `/apple-touch-icon.png` |
| OpenGraph | `/opengraph-image.png` |
| X/Twitter | `/twitter-image.png` |

## 2. Navbar

```tsx
import Link from "next/link";
import { SigmaLogo } from "@/components/SigmaLogo";

<Link href="/" aria-label="SIGMA Ecosystem — Beranda">
  <SigmaLogo variant="primary" className="h-9 w-auto md:h-11" priority />
</Link>
```

Untuk navbar gelap, gunakan `variant="white"`. Untuk tampilan mobile yang sangat sempit, gunakan `variant="mark"`.

## 3. Metadata

Gabungkan objek pada `layout-metadata.example.ts` ke metadata yang telah ada. Jika proyek sudah memiliki `metadataBase`, title, atau description, pertahankan nilai produksi dan hanya tambahkan konfigurasi icons, manifest, openGraph, dan twitter.

## 4. PWA

Gunakan `app/manifest.ts` sebagai sumber utama manifest. Jika proyek lama masih membaca `public/manifest.json`, paket juga menyediakan file kompatibilitas tersebut. Pilih satu referensi manifest di metadata agar tidak membingungkan browser.

## 5. Avatar chatbot

Gunakan `/brand/sigma/avatar-ai-128.png` untuk daftar pesan biasa dan `/brand/sigma/avatar-ai-256.png` untuk layar Retina. Alt text yang disarankan: `Asisten AI SIGMA`.

## 6. Orbit SSO dan halaman login

- Pusat orbit: mark 256–320 px.
- Login desktop: stacked logo dengan lebar 220–280 px.
- Login mobile: horizontal logo dengan lebar 180–220 px.
- Gunakan logo putih hanya jika rasio kontras terhadap latar minimal 4,5:1.

## 7. Pemeriksaan sebelum rilis

- `npm run build` selesai tanpa error.
- `/manifest.webmanifest` atau `/manifest.json` dapat dibuka.
- Ikon PWA tidak terpotong pada bentuk lingkaran dan squircle.
- Logo tidak bergeser saat gambar dimuat; komponen sudah menyimpan rasio asli.
- Preview tautan menampilkan gambar 1200×630.
- Tema gelap memakai logo putih, bukan logo berwarna yang kehilangan kontras.

