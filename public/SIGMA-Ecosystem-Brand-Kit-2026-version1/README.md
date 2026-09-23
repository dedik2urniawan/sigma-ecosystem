# SIGMA Ecosystem — Brand Kit 2026

Paket aset website yang dibuat dari dua PNG yang Anda lampirkan. Nama visual **Sigma Ecosystem** dan tagline **Satu Data Cegah Stunting** mengikuti gambar sumber.

## Mulai dari sini

1. Buka `PREVIEW.html` setelah mengekstrak ZIP untuk melihat seluruh keluarga logo pada latar terang dan gelap.
2. Salin isi folder `public/` ke folder `public/` proyek Next.js. Periksa konflik nama sebelum mengganti aset lama.
3. Gunakan `logo-sigma-navbar.svg` untuk navbar dan `logo-sigma-horizontal-tagline.png` untuk komposisi asli dengan tagline.
4. Baca `docs/IMPLEMENTASI-NEXTJS.md`, lalu gabungkan contoh konfigurasi dari `integration/` ke kode yang sudah ada.

## Isi utama

| Folder | Isi |
| --- | --- |
| `public/images/branding/` | Logo mark, horizontal, horizontal dengan tagline, navbar proporsional, stacked, wordmark; full color, putih, dan dark slate; SVG dan PNG; avatar AI |
| `public/icons/` | PWA 192 dan 512; maskable 192 dan 512; Apple 180; favicon SVG dan PNG 16–64 |
| `public/favicon.ico` | ICO multiukuran 16, 32, 48, 64, 128, 256 |
| `public/social/` | OG 1200 × 630; Twitter 1200 × 600; master SVG kartu sosial |
| `print/` | SVG master cetak dan PNG 3600 px, metadata 300 DPI |
| `integration/` | Komponen logo, contoh penggunaan, contoh metadata dan manifest, CSS tokens, template co-branding |
| `docs/` | Panduan, warna HEX/JSON, inventaris ukuran, hasil validasi |
| `source/` | Dua PNG asli, tanpa perubahan |

## Status sumber dan akurasi

- PNG horizontal dengan tagline, PNG wordmark, dan dua file `source/` mempertahankan sumber raster. Margin transparan pada turunan PNG dirapikan. PNG tanpa tagline berasal dari raster yang sama dengan tagline dihapus.
- SVG adalah **rekonstruksi vektor dari PNG**, menggunakan path nyata; bukan PNG yang dibungkus SVG. Bentuk huruf ditrace dari sumber, bukan diketik ulang dengan font pengganti. Simbol menggunakan path hasil tracing dan pendekatan gradasi. Perbedaan kecil pada tepi dan warna mungkin ada; ini bukan master vektor asli milik desainer.
- PNG navbar, stacked, dan varian monokrom dirender dari SVG rekonstruksi. Ikon PWA, favicon raster dan avatar diturunkan dari PNG logo mark asli.
- PNG 1024 adalah ekspor terukur dari mark sumber yang area gambarnya sekitar 518 × 906 px. Pembesaran tidak menambah detail sumber. Untuk cetak besar gunakan SVG setelah pemeriksaan visual.
- Kode warna logo adalah nilai representatif gradasi, bukan satu warna datar resmi. Token UI merupakan usulan tambahan dan tidak mewarnai ulang file asli.
- SVG tidak dijamin di bawah 15 KB; path huruf dan gradasi menambah ukuran. Ukuran sebenarnya tercatat dalam inventaris.
- Avatar memakai logo asli tanpa menambahkan sparkle agar identitas tetap konsisten.
- **Co-branding belum final:** `integration/cobranding-template.svg` berisi slot berlabel untuk lambang resmi Kabupaten Malang. Lambang tidak dilampirkan dalam permintaan ini dan tidak direka ulang.
- Paket ini menyiapkan aset dan contoh integrasi. Repository aplikasi tidak tersedia; tidak ada perubahan atau deployment website yang dilakukan. Build, service worker, dan preview metadata perlu diperiksa pada proyek asli.

## Penggunaan visual

- Full color: latar putih atau sangat terang. Tulisan Ecosystem hitam pada sumber memang tidak terlihat pada latar hitam.
- White: latar gelap. Dark slate: cetak satu warna / dokumen terang.
- Navbar: komposisi alternatif dengan proporsi tulisan lebih besar terhadap simbol. Untuk fidelitas komposisi awal pilih horizontal-tagline.
- Ukuran awal navbar yang disarankan 208 × 48 CSS px; pada layar sempit gunakan mark 40–48 px.
- Sisakan ruang bebas sekurangnya sekitar 1/8 tinggi logo; jangan meregangkan rasio atau menambahkan shadow ke master.
- Simpan tagline pada tampilan besar. Hindari memaksa tagline kecil menjadi terbaca di favicon/navbar.

## Referensi teknis

- [Next.js — icons](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons)
- [Next.js — manifest](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest)
- [Next.js — metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [W3C — icon masks and safe zone](https://www.w3.org/TR/appmanifest/#icon-masks-and-safe-zone)
