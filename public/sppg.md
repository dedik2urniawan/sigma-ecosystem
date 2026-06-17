# Product Requirement Document (PRD)
## Modul Form Supervisi & Monitoring Gizi - Program Makan Bergizi Gratis (MBG)
### Komponen Terintegrasi: SIGMA Ecosystem (Kabupaten Malang)

---

## 1. Informasi Dokumen
* **Product Name:** Modul Supervisi Gizi MBG (SIGMA Ecosystem)
* **Document Version:** 1.0.0
* **Date:** 17 Juni 2026
* **Author:** Tim Pengembang Dinas Kesehatan Kabupaten Malang (Perwakilan Seksi Gizi Masyarakat)
* **Status:** Draft for Review / Integration

---

## 2. Latar Belakang & Tujuan
### 2.1 Latar Belakang
Berdasarkan Petunjuk Teknis Penyelenggaraan Bantuan Pemerintah untuk Program Makan Bergizi Gratis, pengawasan terhadap kualitas gizi, ketepatan gramasi porsi, dan pemenuhan standar kearifan lokal di tingkat Satuan Pelayanan Pemenuhan Gizi (SPPG) bersifat wajib dan berkala. Untuk meningkatkan akuntabilitas, efisiensi di lapangan, dan integrasi data lintas seksi (Gizi Masyarakat & Kesehatan Lingkungan), diperlukan digitalisasi instrumen supervisi fisik ke dalam ekosistem aplikasi internal (**SIGMA Ecosystem**).

### 2.2 Tujuan
* Menyediakan antarmuka entri data berbasis mobile/web yang responsif untuk supervisor Dinas Kesehatan di lapangan.
* Mengotomatisasi perhitungan komparasi porsi melalui fitur **Analisis Weighting Otomatis**.
* Menghasilkan pelaporan real-time berformat JSON/PDF untuk diteruskan ke pemangku kebijakan.

---

## 3. Aktor & Hak Akses (User Personas)
| Role | Deskripsi Hak Akses dalam Sistem |
| :--- | :--- |
| **Supervisor Gizi (Dinkes)** | Membuat form baru, melakukan entri data kualitatif/kuantitatif di lapangan, melihat dasbor analitik hasil penimbangan, finalisasi form. |
| **Administrator Dinkes** | Mengelola master data standar porsi per kelompok sasaran, memanajamen akun pengguna, mengekspor agregasi data ke format Excel/CSV. |
| **Viewer / Kepala Dinas** | Membaca hasil agregasi pengawasan (*Read-Only*) untuk kebutuhan monitoring performa SPPG sewilayah Kabupaten Malang. |

---

## 4. Alur Kerja Sistem (System Workflow)
1. **Inisiasi:** Supervisor login ke SIGMA Ecosystem -> Pilih menu "Supervisi SPPG" -> Klik "Tambah Form Baru".
2. **Identifikasi:** Mengisi metadata identitas SPPG (Sistem menarik koordinat geospasial dan master data SPPG otomatis via API).
3. **Kuesioner:** Mengisi Bagian Pertanyaan Tertutup (Checkbox Ya/Tidak) dan Bagian Pertanyaan Terbuka (Textarea).
4. **Audit Weighting:** Input berat standar menu harian dan hasil penimbangan nyata (3 sampel acak). Sistem menghitung persentase kesesuaian dan memunculkan status kelayakan secara real-time.
5. **Finalisasi:** Validasi tanda tangan digital -> Simpan -> Sinkronisasi ke Cloud DB.

---

## 5. Kebutuhan Fungsional (Functional Requirements)

### 5.1 Fitur 1: Blok Identitas & Metadata SPPG
* **Deskripsi:** Form wajib untuk mengunci konteks entitas yang sedang diawasi.
* **Komponen Data:**
  * `sppg_id` (String/UUID - Auto-select dropdown dari master data)
  * `nama_yayasan` (String - Read-only setelah `sppg_id` terpilih)
  * `nama_ahli_gizi` (String - Input manual / Auto-fill)
  * `tanggal_supervisi` (Date - Default: Hari ini)
  * `koordinat_gps` (Geospasial - Geo-location capture otomatis)

### 5.2 Fitur 2: Evaluasi Kualitatif (Closed & Open Questions)
Antarmuka kuesioner dibagi menjadi tab/section terpisah dengan skema input berikut:

#### 5.2.1 Section A: Pertanyaan Tertutup (Closed-Ended Component)
* **Tipe Komponen UI:** Radio Button (Ya / Tidak) + Textbox (Catatan).
* **Aturan Bisnis:** Jika memilih "Tidak" pada item berlabel `[KRUSIAL]`, sistem akan memberikan penanda *High Priority Flag* pada dasbor agregat laporan.

*Daftar Pertanyaan Tertutup (Mapping ke Database):*
1. `q_gizi_01`: Apakah SPPG memiliki Tenaga Ahli Gizi penanggung jawab produksi?
2. `q_gizi_02`: Apakah penyusunan master menu dilakukan secara berkala setiap minggu?
3. `q_gizi_03`: Apakah master menu disusun spesifik berdasarkan 8 kelompok sasaran?
4. `q_gizi_04`: Apakah penggunaan bahan pangan wajib terfortifikasi (garam beryodium, dll.) diterapkan?
5. `q_gizi_05`: Apakah menu dirancang menggunakan bahan pangan kearifan lokal?
6. `q_gizi_06`: Apakah sudah dilakukan identifikasi terhadap sasaran yang memiliki riwayat alergi?
7. `q_gizi_07` `[KRUSIAL]`: Apakah pihak dapur mengambil dan menyimpan sampel makanan (*safety food*) 1 porsi lengkap di lemari pendingin setiap hari?
8. `q_gizi_08`: Apakah wadah distribusi menggunakan *foodtray stainless steel* 5 cekungan berstandar *foodgrade*?

#### 5.2.2 Section B: Pertanyaan Terbuka (Open-Ended Component)
* **Tipe Komponen UI:** Textarea (Rich Text/Plain Text, Max 1000 karakter).
* **Daftar Field:**
  * `notes_penerimaan_menu`: Strategi identifikasi preferensi rasa anak/sasaran.
  * `notes_hambatan_fortifikasi`: Kendala pasokan bahan pangan wajib terfortifikasi di pasar lokal.
  * `notes_alur_kedaruratan`: Protokol mitigasi darurat keracunan bersama Puskesmas setempat.

---

### 5.3 Fitur 3: Mesin Hitung Analisis Weighting (Kuantitatif)
* **Deskripsi:** Antarmuka tabel dinamis untuk menghitung akurasi porsi piring makan nyata yang didistribusikan ke sasaran.
* **Logika Input:** User memilih 1 Jenis Kelompok Sasaran, lalu menginput berat standar menu (gram) dan berat hasil timbang 3 sampel nyata.

#### 5.3.1 Matriks Kelompok Sasaran Dropdown
* Balita / PAUD / SD Kelas 1-3 / SD Kelas 4-6 / SMP / SMA / Ibu Hamil / Ibu Menyusui.

#### 5.3.2 Komponen Baris Hidangan (Matriks Input)
Sistem menyediakan input baris untuk komponen: 
1. Makanan Pokok (Nasi/Karbohidrat)
2. Lauk Hewani
3. Lauk Nabati
4. Sayuran (Kering/Minim Kuah)
5. Buah
6. Susu (Opsional)

#### 5.3.3 Algoritma Perhitungan Sistem (Business Logic)
1. **Rata-Rata Berat Nyata ($W_{rata}$):**
   $$W_{rata} = \frac{Sampel_1 + Sampel_2 + Sampel_3}{3}$$
2. **Persentase Kesesuaian ($P_{kesesuaian}$):**
   $$P_{kesesuaian} = \left( \frac{W_{rata}}{Berat_{Standar}} \right) \times 100\%$$
3. **Kondisi Evaluasi Otomatis (UI-Driven Alert):**
   * `IF` $P_{kesesuaian} \ge 95\%$ `AND` $\le 105\%$ $\rightarrow$ **Status:** `Sesuai Standar` (Badge Hijau)
   * `IF` $P_{kesesuaian} < 95\%$ $\rightarrow$ **Status:** `Kurang dari Standar` (Badge Merah + Alert: "Indikasi Pengurangan Gramasi Secara Sengaja!")
   * `IF` $P_{kesesuaian} > 105\%$ $\rightarrow$ **Status:** `Melebihi Standar` (Badge Kuning + Alert: "Potensi Pembengkakan Biaya & Food Waste")

---

## 6. Struktur Skema Data (JSON Payload Schema)
Berikut adalah contoh struktur payload API saat form dikirimkan (*POST Request*) ke endpoint server SIGMA Ecosystem:

```json
{
  "supervisi_id": "req-992a-2026-mgl",
  "metadata": {
    "sppg_id": "SPPG-MALANG-012",
    "nama_sppg": "Satpel Gizi Singosari",
    "ahli_gizi": "Risa Amalia, S.Gz",
    "tanggal_supervisi": "2026-06-17",
    "gps_coordinates": {
      "latitude": -7.89234,
      "longitude": 112.65412
    }
  },
  "evaluasi_kualitatif": {
    "closed_questions": [
      {"question_id": "q_gizi_01", "answer": true, "note": "Ada, bersertifikat S1 Gizi"},
      {"question_id": "q_gizi_07", "answer": true, "note": "Sampel tersimpan di chiller suhu 4C"}
    ],
    "open_questions": {
      "identifikasi_preferensi": "Melakukan sisa makanan plate-waste audit setiap jumat.",
      "kendala_fortifikasi": "Beras terfortifikasi masih harus disuplai dari Bulog kota."
    }
  },
  "analisis_weighting": {
    "kelompok_sasaran": "SD Kelas 1-3",
    "menu_hari_ini": "Nasi Kari Ayam, Tempe Goreng, Capcay, Pisang",
    "audit_records": [
      {
        "komponen": "Makanan Pokok",
        "berat_standar": 150,
        "sampel_1": 152,
        "sampel_2": 149,
        "sampel_3": 150,
        "rata_rata": 150.33,
        "persentase": 100.22,
        "status": "Sesuai Standar"
      },
      {
        "komponen": "Lauk Hewani",
        "berat_standar": 60,
        "sampel_1": 52,
        "sampel_2": 55,
        "sampel_3": 54,
        "rata_rata": 53.66,
        "persentase": 89.43,
        "status": "Kurang dari Standar"
      }
    ]
  },
  "finalisasi": {
    "signature_supervisor_url": "[https://storage.sigma.internal/signatures/spv_gizi_01.png](https://storage.sigma.internal/signatures/spv_gizi_01.png)",
    "is_locked": true
  }
}