# Product Requirements Document (PRD): Modul Supervisi Instalasi Gizi RS (SIGMA Faskes)

## 1. Meta Informasi
* **Nama Produk:** SIGMA Faskes - Modul Supervisi Instalasi Gizi
* **Pemilik Produk (Product Owner):** Dinas Kesehatan (Tim Gizi & KIA)
* **Status Dokumen:** Draft - v1.0
* **Target Rilis:** MVP (Minimum Viable Product) Q3 2026

---

## 2. Ringkasan Eksekutif (Executive Summary)
Modul **Supervisi Instalasi Gizi RS** dalam ekosistem aplikasi **SIGMA Faskes** bertujuan untuk mendigitalisasi proses penilaian, audit, dan pembinaan Instalasi Gizi Rumah Sakit oleh Dinas Kesehatan. Sistem ini mengubah instrumen supervisi berbasis kertas/Excel menjadi alur kerja digital yang terintegrasi, yang mencakup pengisian *checklist* berskor, pengunggahan bukti lapangan (foto/dokumen), hingga pelacakan Rencana Tindak Lanjut (CAPA - *Corrective Action and Preventive Action*).

Selain itu, sistem ini dirancang untuk memonitor kepatuhan RS terhadap **Pelita Kesmas (Kemenkes)**, khususnya pada penanganan balita Gizi Buruk di fasilitas rawat inap, memastikan adanya kontinuitas data dari skrining hingga rujukan.

---

## 3. Latar Belakang & Masalah
1. **Pencatatan Manual:** Supervisi gizi ke RS saat ini masih menggunakan form Excel atau kertas yang menyulitkan agregasi data dan pelacakan historis pembinaan.
2. **Kepatuhan Pelaporan Kurang:** Terdapat kesenjangan (gap) dalam kepatuhan RS untuk melengkapi data perawatan balita gizi buruk (pemberian F75/F100) di platform SIGIZI-KESGA (Modul Pelita Kesmas).
3. **Follow-up / Tindak Lanjut Terabaikan:** Temuan supervisi dari Dinkes seringkali tidak ditindaklanjuti oleh RS (tidak ada sistem alarm/pengingat untuk *Corrective Action*).
4. **Pendekatan Silo:** Data gizi klinik, tata kelola makanan (MSPM), dan SDM sering kali tidak dilihat sebagai satu kesatuan indikator mutu rumah sakit.

---

## 4. Tujuan & Metrik Keberhasilan (Objectives & Key Results)
* **Tujuan Utama:** 1. Standardisasi instrumen supervisi gizi di seluruh faskes/RS di wilayah Dinkes.
  2. Mewujudkan pemantauan terpusat terhadap penyelesaian masalah (CAPA) yang ditemukan saat supervisi.
  3. Memastikan 100% RS rujukan melaporkan tatalaksana gizi buruk secara by-name by-address di Pelita Kesmas.
* **Metrik Keberhasilan (KPI):**
  * **Adoption Rate:** 100% dari total RS di wilayah terkait menggunakan SIGMA Faskes untuk merespon hasil supervisi.
  * **Resolution Time:** Rata-rata waktu RS menyelesaikan temuan minor/mayor menurun menjadi < 30 hari.
  * **Compliance Rate Pelita Kesmas:** Kepatuhan RS dalam _update_ status pasien gizi buruk meningkat menjadi minimal 95%.

---

## 5. Persona Pengguna (User Personas)
1. **Supervisor Gizi Dinkes (Auditor):** * *Peran:* Melakukan kunjungan, menilai indikator, mencatat temuan lapangan, dan menyetujui laporan perbaikan dari RS.
2. **Kepala Instalasi Gizi RS & PIC Pelita Kesmas (Auditee):** * *Peran:* Menerima hasil supervisi, mendistribusikan tugas perbaikan ke unit terkait, mengunggah bukti perbaikan (RTL), dan memastikan kelengkapan alat pelaporan gizi buruk.
3. **Admin SIGMA (Dinkes Level):** * *Peran:* Mengatur jadwal supervisi, manajemen user, dan menyesuaikan kriteria instrumen (CMS Form).

---

## 6. Ruang Lingkup & Kebutuhan Fitur (Scope & Requirements)

### EPIC 1: Perencanaan & Penjadwalan Supervisi
* **US 1.1:** Admin/Supervisor dapat membuat jadwal supervisi untuk RS tertentu dan menetapkan tim auditor.
* **US 1.2:** Sistem mengirimkan notifikasi H-7 kepada PIC RS terkait jadwal kedatangan tim Dinkes.

### EPIC 2: Instrumen Supervisi Digital (Mobile-Friendly & Offline First)
Sistem menyediakan form checklist digital berbasis poin 0, 1, dan 2. Karena koneksi internet di area dapur/gudang RS sering buruk, sistem harus mendukung *Offline Data Entry*.
Domain yang dinilai mencakup:
* **2.1 Manajemen & Tata Kelola:** Pengecekan SK, Pedoman, SOP, Evaluasi Indikator Mutu.
* **2.2 Manajemen Sistem Penyelenggaraan Makanan (MSPM):** Pengecekan siklus menu, vendor bahan, gudang (FIFO/FEFO, suhu), higiene produksi (HACCP), dan ketepatan distribusi makanan.
* **2.3 Gizi Klinik:** *Tracer* rekam medis untuk skrining gizi awal 24 jam, asuhan gizi (PAGT/ADIME), toleransi makan, dan edukasi pasien.
* **2.4 Mutu, Keselamatan Pasien, & PPI:** Kepatuhan cuci tangan, kelengkapan APD petugas dapur, manajemen limbah makanan.
* **2.5 SDM Gizi:** Pola ketenagaan, pelatihan berkala (in-house training), dan supervisi internal RS.
* **2.6 Kepatuhan Pelita Kesmas (Khusus):** Pengecekan eksistensi PIC yang memiliki akses akun SIGIZI-KESGA, kelengkapan form pasien balita masuk, monitoring pemberian MTG (Makanan Terapi Gizi), dan pencatatan status keluar/rujuk balik balita ke Puskesmas.

* **Fitur Utama pada Form Checklist:**
  * **Input Bukti:** Tombol unggah foto langsung dari kamera (misal: foto kulkas bahan makanan) atau upload dokumen (PDF SOP).
  * **Catatan Tambahan:** Kolom catatan (Notes) di setiap elemen penilaian.
  * **Auto-Calculate:** Sistem otomatis menghitung total skor per domain dan memberikan predikat (misal: Kurang, Cukup, Baik, Paripurna).

### EPIC 3: Manajemen Tindak Lanjut / CAPA (Corrective Action Preventive Action)
* **US 3.1:** RS dapat melihat Dashboard Temuan yang dikelompokkan menjadi **Mayor** (berisiko langsung pada pasien/mutu) dan **Minor** (administratif).
* **US 3.2:** RS dapat mengisi Rencana Tindak Lanjut (RTL) pada setiap temuan, termasuk menunjuk *Person In Charge* internal RS dan tenggat waktu (Deadline).
* **US 3.3:** RS mengunggah bukti perbaikan (foto/dokumen) ke dalam platform.
* **US 3.4:** Supervisor Dinkes melakukan verifikasi terhadap bukti perbaikan (Approve / Reject dengan catatan).

### EPIC 4: Dashboard & Pelaporan Analitik
* **US 4.1:** Dashboard Tingkat Dinkes: Menampilkan Peta Kepatuhan Gizi RS se-kabupaten/kota, Top 5 RS Terbaik, dan Top 5 RS dengan temuan terbanyak.
* **US 4.2:** Visualisasi grafik radar (Radar Chart) untuk melihat domain mana yang secara agregat paling lemah (misal: RS rata-rata lemah di Gizi Klinik, tapi bagus di MSPM).
* **US 4.3:** Laporan PDF & Excel otomatis per RS (Berita Acara Supervisi Gizi) yang dilengkapi e-signature.

---

## 7. Arsitektur & Kebutuhan Integrasi Sistem
* **SSO (Single Sign-On):** Terintegrasi dengan akun SIGMA yang sudah ada.
* **API Pelita Kesmas (Future Phase):** Sinkronisasi *read-only* dari dashboard Pelita Kesmas/SIGIZI Kemenkes untuk menampilkan "Jumlah Balita Dirawat di RS X vs Jumlah Laporan di Aplikasi" sebagai referensi auditor saat supervisi.

---

## 8. Wireframe / UI-UX Guidelines (Panduan Desain)
* **Warna & Tema:** Menyesuaikan dengan standar desain SIGMA yang ada (bersih, profesional, dominan putih dengan aksen biru/hijau tosca khas kesehatan).
* **Tipografi:** Sans-serif (Inter atau Roboto) untuk keterbacaan yang tinggi pada perangkat mobile maupun desktop.
* **Navigasi:** * Menu utama: *Dashboard*, *Jadwal Supervisi*, *Mulai Supervisi (Checklist)*, *Tindak Lanjut (CAPA)*, *Laporan*.
  * Status CAPA ditandai warna mencolok: Merah (Terlambat/Overdue), Kuning (Dalam Proses), Hijau (Selesai/Verified).

---

## 9. Kriteria Penerimaan (Acceptance Criteria)
Sebuah rilis dianggap berhasil jika:
1. Supervisor Dinkes berhasil menyelesaikan 1 siklus penuh simulasi supervisi di sistem (dari input jadwal, pengisian nilai di semua 6 domain, hingga klik "Submit Final").
2. Akun RS (Auditee) berhasil menerima notifikasi temuan dan bisa memberikan respons perbaikan beserta bukti unggahan PDF/Foto max 5MB.
3. Fungsi cetak *Berita Acara* berhasil menghasilkan dokumen berformat standar sesuai regulasi Dinkes.
4. Fitur pengisian checklist tetap dapat menyimpan data ke *local storage/cache* saat simulasi koneksi terputus (*offline mode*) dan *sync* kembali saat online.
