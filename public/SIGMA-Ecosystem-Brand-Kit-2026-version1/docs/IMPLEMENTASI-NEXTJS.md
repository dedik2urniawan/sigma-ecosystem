# Integrasi ke Next.js App Router

## 1. Pemetaan aset

| Penempatan | Path publik |
| --- | --- |
| Navbar desktop | `/images/branding/logo-sigma-navbar.svg` |
| Navbar mobile / orbit SSO | `/images/branding/logo-sigma-mark.svg` |
| Login statis / splash | `/images/branding/logo-sigma-stacked.svg` |
| Header dengan tagline asli | `/images/branding/logo-sigma-horizontal-tagline.png` |
| Footer gelap | `/images/branding/logo-sigma-navbar-white.svg` |
| Avatar chatbot | `/images/branding/avatar-ai-128.png` |
| OG / WhatsApp | `/social/opengraph-image.png` |
| Ikon Apple | `/icons/apple-touch-icon.png` |

## 2. Komponen

Salin `SigmaLogo.tsx` ke folder komponen proyek. Contoh `usage.example.tsx` memakai Tailwind untuk tinggi dan lebar otomatis. Jika Tailwind tidak digunakan, berikan CSS setara: `height: 48px; width: auto`. Sesuaikan import dengan struktur proyek.

Cari referensi `sigma_logo`, logo lama, Navbar, footer, halaman utama, login SSO, dan avatar chatbot sebelum menggantinya. Instruksi direktori/baris yang Anda bagikan diperlakukan sebagai konteks, bukan hasil pemeriksaan repository saat ini.

## 3. Manifest

Gabungkan array `icons`, `name`, dan warna dari `manifest.example.json` ke manifest aktif. Contoh lengkap dapat ditempatkan di `public/manifest.json` untuk proyek baru. Pada aplikasi yang sudah terpasang, **pertahankan id, start_url, scope, shortcuts, dan preferensi lain yang sudah ada** kecuali ada keputusan migrasi. Jangan membuat manifest ganda dengan `app/manifest.ts` atau `app/manifest.json`.

Ikon dengan `purpose: any` dan `purpose: maskable` dipisahkan. Maskable menggunakan latar solid dengan seluruh simbol di dalam lingkaran aman radius 40% sisi gambar, bukan sekadar kotak 80%. [Spesifikasi W3C](https://www.w3.org/TR/appmanifest/#icon-masks-and-safe-zone).

## 4. Metadata

`metadata.example.ts` menyediakan `getSigmaMetadata(siteUrl)` dan `sigmaViewport`. Pada root `layout.tsx`, gabungkan field yang diperlukan dengan metadata yang sudah ada. Masukkan origin produksi yang benar; paket tidak menetapkan salah satu domain sebagai domain resmi. Jangan menyalin contoh menjadi layout pengganti.

Contoh pola untuk proyek baru:

```tsx
import { getSigmaMetadata, sigmaViewport } from "./metadata.example";

const siteUrl = process.env.SITE_URL;
if (!siteUrl) throw new Error("SITE_URL harus berupa origin produksi yang valid");
export const metadata = getSigmaMetadata(siteUrl);
export const viewport = sigmaViewport;
```

Untuk proyek yang memiliki metadata lama, merge secara sadar; jangan menimpa robots, verification, alternates/canonical, judul per halaman, atau metadata lain yang sudah benar. `themeColor` dipasangkan melalui export `viewport`. [Referensi metadata Next.js](https://nextjs.org/docs/app/api-reference/functions/generate-metadata).

File metadata konvensional seperti `app/favicon.ico`, `app/icon.png`, `app/apple-icon.png`, atau `app/opengraph-image.png` dapat mengambil prioritas. Perbarui aset konvensional yang sudah dipakai atau pilih konfigurasi eksplisit dalam paket secara konsisten. Jangan meninggalkan favicon lama di `app/` sambil mengharapkan `public/favicon.ico` menggantikannya. [Referensi ikon](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons).

Paket menggunakan metadata eksplisit untuk OG dan Twitter. Alternatifnya salin kartu sosial ke file konvensional `app/opengraph-image.png` dan `app/twitter-image.png` lalu sesuaikan konfigurasi agar tidak ganda.

## 5. Token warna

Import `brand-tokens.css` dari global CSS atau root layout. CSS custom properties dapat dipakai tanpa bergantung pada versi Tailwind, misalnya `color: var(--sigma-primary)`. Periksa kontras pada komponen nyata sebelum menjadikan warna gradasi logo sebagai warna teks kecil.

## 6. Pemeriksaan setelah integrasi

- Jalankan lint/build proyek yang sudah tersedia.
- Pastikan seluruh URL aset memberi respons berhasil dan rasio logo tidak berubah.
- Periksa navbar terang/gelap, mobile, SSO, chatbot, dan footer.
- Periksa manifest serta ikon melalui panel Application di browser.
- Perbarui revisi cache aset/service worker sesuai plugin PWA yang dipakai; uji hard refresh dan instalasi ulang bila launcher masih menampilkan ikon lama.
- Periksa HTML metadata halaman publik dan uji tautan sosial; cache platform sosial dapat bertahan setelah aset diubah.

Pengujian ini belum dijalankan pada aplikasi SIGMA karena repository/deployment tidak tersedia dalam tugas ini.
