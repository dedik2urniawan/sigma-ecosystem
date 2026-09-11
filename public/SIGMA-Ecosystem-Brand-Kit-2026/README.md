# SIGMA Ecosystem Brand Kit 2026

Paket ini menormalkan delapan desain final SIGMA Ecosystem menjadi aset siap pakai untuk Next.js App Router, PWA, iOS, favicon, chatbot, media sosial, dan dokumen cetak.

## Palet utama

| Token | HEX | Penggunaan |
|---|---:|---|
| Sigma Blue | `#0062FF` | warna merek utama, tombol, tautan |
| Deep Blue | `#0051F1` | state aktif dan aksen gelap |
| Digital Cyan | `#0A9FFB` | gradasi utama |
| Health Cyan | `#17D2FB` | highlight dan visual kesehatan |
| Sigma Navy | `#17274D` | teks utama dan logo gelap |
| Ice Surface | `#EFF9FF` | latar ikon dan permukaan lembut |
| White | `#FFFFFF` | logo invers dan latar bersih |

## Struktur paket

- `source-master/`: delapan file asli yang dinormalisasi namanya.
- `assets/logos/`: enam komposisi logo PNG transparan dan SVG wrapper.
- `assets/icons/`: ikon PWA, maskable, Apple, favicon, dan avatar chatbot.
- `assets/social/`: OpenGraph 1200×630, X/Twitter 1200×600, dan avatar 1080×1080.
- `assets/print/`: logo resolusi tinggi dengan metadata 300 DPI.
- `drop-in/`: struktur siap salin ke proyek Next.js.
- `implementation/`: panduan integrasi dan skrip pembentukan ulang SVG wrapper.

## Implementasi tercepat

1. Salin seluruh isi `drop-in/public/` ke folder `public/` proyek SIGMA.
2. Salin `drop-in/src/app/manifest.ts`, `drop-in/src/components/SigmaLogo.tsx`, dan `drop-in/src/styles/sigma-brand.css` ke lokasi setara di proyek.
3. Gabungkan isi `drop-in/src/app/layout-metadata.example.ts` ke `app/layout.tsx` yang sudah ada. Jangan mengganti struktur layout, provider, atau font yang sedang dipakai.
4. Atur `NEXT_PUBLIC_SITE_URL` ke domain produksi.
5. Ganti pemanggilan logo lama dengan komponen `<SigmaLogo />` sesuai contoh di `implementation/NEXTJS-INTEGRATION.md`.
6. Jalankan `npm run build` dan uji install PWA, preview WhatsApp/LinkedIn, serta tampilan navbar pada tema terang dan gelap.

## Aturan penggunaan logo

- Navbar terang: `horizontal-primary`.
- Navbar atau hero gelap: `horizontal-white`.
- Dokumen hitam-putih atau UI netral: `horizontal-dark`.
- Ikon kecil, chatbot, dan orbit SSO: `mark-primary` atau aset pada `assets/icons/`.
- Login, splash, dan poster vertikal: `stacked-primary`.
- Jangan meregangkan rasio, mengganti warna internal, menambah bayangan, atau menaruh logo di atas latar yang kontrasnya rendah.
- Sisakan ruang aman minimal sebesar diameter titik bulat pada logo di semua sisi.

## Catatan SVG

Sumber yang diberikan berupa PNG. File `.svg` dalam paket ini adalah wrapper SVG mandiri yang menanamkan master PNG beresolusi tinggi agar dapat dipakai langsung pada `<img>` tanpa dependensi file eksternal. Tampilannya identik dengan desain final, tetapi bukan kurva vektor yang dapat diedit per bentuk. Untuk kebutuhan percetakan skala sangat besar atau penyuntingan bentuk, gunakan file AI/EPS/SVG asli dari desainer bila tersedia.

## Deskripsi merek

**Nama:** SIGMA Ecosystem  
**Tagline:** AI & Health Technology Ecosystem  
**Deskripsi singkat:** Ekosistem teknologi kesehatan dan kecerdasan artifisial untuk mendukung surveilans, analitik, integrasi layanan, dan pengambilan keputusan.

