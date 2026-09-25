# PRD — SIGMA RCS: Analisis PMT Lokal Balita dan Ibu Hamil KEK

**Versi:** 1.0 • 24 September 2026  
**Produk:** SIGMA RCS 2.0 / SIGMA Ecosystem  
**Status:** Spesifikasi implementasi bertahap untuk Antigravity  
**Stack sasaran:** Next.js App Router, TypeScript, Tailwind, PostgreSQL/Supabase  
**Kohort contoh:** Kabupaten Malang, awal pengukuran/mulai PMT Juni 2026; pembaruan data sampai Desember 2026.

## 1. Keputusan produk

Buat menu **Analisis PMT Lokal** tersendiri pada Dashboard RCS, dengan domain **Balita** (gizi kurang, berat badan kurang, berat badan tidak naik/T) dan **Ibu Hamil KEK/Risiko KEK**. Unit utama adalah **episode intervensi individu**, sedangkan modul indikator yang sudah ada memakai rekap administratif desa. Kedua jenis angka harus ditampilkan dan direkonsiliasi, tanpa dianggap setara.

Menu memberikan ketepatan sasaran, mutu data, retensi pemantauan, perubahan status gizi dan berat badan, pemulihan menurut jendela waktu, perbedaan strata, serta insight wilayah. **Hanya tampilkan indikator yang benar-benar didukung kolom sumber.** Jika tanggal pengukuran akhir atau titik kunjungan tidak tersedia, nilai laju mingguan dan hasil W2/W4/W8 adalah `null` dengan label “Belum dapat dihitung”, bukan 0. Perubahan sebelum–sesudah tidak membuktikan dampak kausal PMT.

| Peran | Keputusan |
|---|---|
| Kabupaten | Kesenjangan jangkauan, ketepatan sasaran dan capaian menurut indikasi, bulan kohort, dan Puskesmas. |
| Puskesmas | Memperbaiki isian yang meragukan, menindaklanjuti pemantauan yang hilang, melihat desa dan posyandu. |
| Pengelola data | Memeriksa duplikasi, revisi unggahan, keterisian checkpoint, serta selisih dengan rekap indikator. |
| Analis | Mengunduh agregat atau data terdeidentifikasi beserta aturan kohort dan versi rumus. |

## 2. Sumber dan temuan audit

1. `V2.34PMT 2025 010726.pdf`, 38 slide: presentasi analisis PMT balita Indonesia 2025, mencakup penentuan sasaran, DQA, hasil tiga indikasi, dan strata stunting.
2. `V4 Analisis_PMT_Bumil_KEK_2025.pdf`, 19 slide: analisis kenaikan BB ibu hamil KEK 2025 pada minggu 0, 4, 8, 12, 16; trimester saat mulai; dan analisis BBLR dengan data kelahiran tertaut.
3. Empat ekspor riwayat Malang 2026: `Daftar-Riwayat-PMT-Gikur.xls`, `Daftar-Riwayat-PMT-Underweight.xls`, `Daftar Riwayat T.xls`, `Daftar-Riwayat-PMT-Ibu-Hamil-240926092628.xls`. Keempatnya **tabel HTML berekstensi .xls**; parser wajib mendeteksi isi.
4. Screenshot `screencapture-localhost-3000-dashboard-ibu-hamil-2026-09-24-12_22_53.png` dan tiga PRD indikator SIGMA 2026 sebagai pola UI, DQA, master wilayah, dan batas perbedaan dengan rekap administratif.

| Temuan pada contoh | Konsekuensi |
|---|---|
| Gizi kurang 460 baris/459 NIK unik/10 Puskesmas; underweight 604/603/10; T 2.266/2.196/14; bumil 29/29/6. Ada 5 NIK yang sama di T dan underweight. | Sampel parsial; jangan sebut total kabupaten. Bedakan baris, orang unik, indikasi, episode, dan versi. |
| Berkas balita memuat tanggal pengukuran **awal**, BB/TB dan z-score awal–akhir, siklus dan jumlah pemantauan. Tidak memuat tanggal **akhir**, checkpoint bertanggal, jenis PMT eksplisit, ataupun status selesai. | Panel awal–akhir dapat dihitung secara bersyarat; hasil tepat W2/W4/W8 dan g/kgBB/minggu belum dapat dihitung. Jumlah pemantauan bukan durasi. |
| Berkas bumil: semua 29 tanggal mulai Juni; tanggal selesai Juni–September; 24 bertanda `Selesai`; 4 BB akhir kosong dan 1 di antaranya bertanda selesai. Tanpa usia kehamilan awal dan BB minggu 4/8/12/16. | BB awal–akhir deskriptif tersedia; target trimester dan hasil bulanan tidak tersedia. Tanggal selesai administrasi belum tentu tanggal timbang akhir. |
| Contoh nilai z akhir `999.99`, BB akhir `10945`, TB akhir `875`/`1082`, dan teks `83..9`/`10.7 it`. | Parser ketat dan flag DQA; raw dipertahankan tetapi tidak masuk hitungan yang dipengaruhi. |
| Slide balita memakai N T `279.194` di beberapa bagian dan `279.174` pada ringkasan; sampul bumil menyebut `16.952` BB bulan pertama valid, slide pembersihan `18.924` pada W4. | Cantumkan perbedaan sumber. Jangan perlakukan angka nasional sebagai denominator analisis Malang atau target resmi. |

### 2.1 Hubungan dengan indikator RCS

| Metrik | Formula/sumber | Tafsir |
|---|---|---|
| Cakupan PMT administratif balita | GK `[82]/[81]`, BB kurang `[85]/[84]`, T `[88]/[87]` pada PRD Balita Gizi | Rekap desa, bukan jumlah episode yang berhasil pulih. |
| Cakupan PMT administratif bumil | `kek_received_pmt/kek_management_target` pada PRD Ibu Hamil | Rekap kumulatif menurut kebijakan tahun 2026; berbeda dari hasil BB individu. |
| Analisis PMT ini | Satu episode individu dengan baseline, outcome, serta jendela pemantauan terverifikasi | Hasil program teramati; tidak dapat diartikan sebagai efek kausal. |

Perbandingan rekap administratif dan riwayat per wilayah/bulan harus menampilkan dua angka, selisih, dan kemungkinan perbedaan cakupan, kriteria, revisi, serta periode. Jangan menganggap semua selisih sebagai kesalahan.

## 3. Kontrak input dan model data

### 3.1 Mapping balita

| Raw field | Canonical | Aturan |
|---|---|---|
| `NIK`, `Nama`, `JK`, `Tgl Lahir` | `person_key`, `sex`, `birth_date`; nama disimpan terbatas | Baca NIK sebagai string 16 digit, tanpa notasi ilmiah atau hilang nol awal. |
| `Prov`, `Kab/Kota`, `Kec`, `Pukesmas`, `Desa/Kel`, `Posyandu` | Kode master wilayah + nilai raw | `Pukesmas` adalah ejaan kolom sumber; label UI “Puskesmas”. |
| `Tanggal Pengukuran Awal` | `baseline_measured_at` | Bukan otomatis tanggal mulai distribusi PMT. |
| `BB Awal/Akhir`, `TB Awal/Akhir` | Dua observasi `weight_kg`, `length_height_cm` | Simpan angka parsed dan nilai raw; observasi akhir berstatus `date_unknown`. |
| `ZS BB/U`, `ZS TB/U`, `ZS BB/TB` Awal/Akhir | `waz`, `haz`, `whz` | Cek kewajaran sebelum statistik, jangan mengganti hasil sumber diam-diam. |
| Kategori BB/U, TB/U, BB/TB; `Status Pertumbuhan`; `Status Kenaikan BB` | Label klinis raw, status pertumbuhan raw | Kode N/T/O/B memerlukan kamus terverifikasi. |
| `Sumber Anggaran`, `Mitra`, `Siklus PMT`, `Jumlah Pemantauan` | Provenance, `cycle_no`, `monitoring_count_raw` | Tidak mengukur kepatuhan konsumsi atau minggu intervensi. |
| Nama jenis file | `indication_export` | Klaim alasan pemberian, audit terhadap baseline. |

### 3.2 Mapping bumil

| Raw field | Canonical | Aturan |
|---|---|---|
| Identitas, tanggal lahir, wilayah | `person_key`, master wilayah | PII terbatas; NIK tidak diekspor di dashboard umum. |
| `Tanggal Pemberian Pertama`, `Tanggal Selesai` | `pmt_start_at`, `pmt_end_reported_at` | Durasi administrasi; belum membuktikan kapan ditimbang. |
| `Alasan Diberi` | `indication` | Pisahkan `Kurang Energi Kronis` dan `Risiko Kurang Energi Kronis`. |
| `Berat Badan Awal/Akhir` | `baseline_weight_kg`, `end_weight_kg` | Kosong bukan nol; tanggal timbang tersendiri diperlukan. |
| `Hasil Pemberian MT`, `Status PMT` | `result_reported`, `completion_reported` | `Sesuai` bukan sinonim `≥0,5 kg/minggu`; `-` bukan selesai. |
| `Siklus PMT`, `Jumlah Pemantauan` | `cycle_no`, `monitoring_count_raw` | Bukan jumlah bulan dengan BB valid. |

### 3.3 Template tambahan untuk upload sampai Desember

**Minimum longitudinal:** `person_key`, `episode_id`, `indication`, `pmt_type`, `pmt_start_at`, `pmt_status`, `measurement_date`, `weight_kg`, `measurement_source`. Balita: `birth_date`, `sex`, `length_height_cm`, `measurement_mode` (terlentang/berdiri), `waz`, `haz`, `whz`; titik minggu 0/2/4/8 sesuai indikasi. Bumil: `gestational_age_weeks_at_start`, tanggal timbang BB awal dan minggu 4/8/12/16, `lila_cm` atau diagnosis KEK, tanggal usia gestasi saat ukur. Status distribusi, hari diterima dan dikonsumsi diperlukan untuk mengukur dosis/kepatuhan, bukan hanya penerimaan.

**Khusus analisis BBLR lanjutan:** tanggal persalinan, BB lahir dalam gram, usia gestasi saat lahir, jenis kelamin bayi, identitas tautan ibu-bayi dan izin penggunaan. Tanpa data ini tidak ada model BBLR/OR/PAF lokal.

Skema relasional:

```text
raw_upload(id, sha256, filename, format_detected, parser_version,
           uploaded_at, period_label, row_count, uploader_id)
person_private(person_key, nik_encrypted, name_encrypted, birth_date, sex)
pmt_episode(id, person_key, group, indication, cycle_no, start_at?,
            completion_status, facility_id, source_batch_id, version)
pmt_observation(id, episode_id, measured_at?, checkpoint_week?,
                weight_kg?, height_cm?, waz?, haz?, whz?, source, dqa_flags[])
quality_issue(id, episode_id, field, raw_value, rule_version, severity, resolution)
aggregation_run(id, batch_set_hash, formula_version, cutoff, scope, generated_at)
```

Bentuk `person_key=HMAC-SHA256(secret, normalized_NIK)` di server; secret tidak dikirim ke browser. `episode_id` stabil lintas upload berdasarkan orang + indikasi + siklus + tanggal mulai jika tersedia. Tanpa tanggal mulai balita, buat key sementara dan antrekan konflik. `No` urut ekspor bukan kunci. Berkas sama diimpor ulang secara idempoten; perubahan menjadi versi snapshot dengan jejak before/after, bukan episode baru.

## 4. Kohort, cutoff, dan agregasi

1. Filter global: tahun dan **bulan mulai PMT** bila tersedia; jika tidak, tampilkan **bulan pengukuran awal (proksi)**. Tambahkan cutoff observasi, Puskesmas, desa, indikasi, siklus, status selesai, pendanaan, dan stunting awal.
2. Unit utama = episode per indikasi; tampilkan orang unik lintas indikasi. Prioritas audit eksklusivitas sesuai slide 2025: gizi kurang/wasting → underweight tanpa wasting → T tanpa wasting/underweight. Jangan menghapus alasan ekspor asli.
3. Kohort `intake`: episode dimulai pada periode, atau proksi pengukuran awal berlabel. `mature(Wk)`: cutoff ≥ tanggal mulai + k minggu. `evaluable(Wk)`: memenuhi baseline, eligibility, dan outcome bertanggal valid dalam jendela. `completed`: hanya status selesai terkonfirmasi (tidak tersedia pada file balita). `missing outcome` dihitung terpisah.
4. Pilih satu endpoint per episode, yang terdekat dari target dalam jendela, tie-break tanggal lebih awal lalu revisi terbaru. **Usulan konfigurasi:** W2 hari 7–20, W4 hari 21–34, W8 hari 49–70. Ini keputusan produk yang perlu disahkan karena slide tidak mendefinisikan toleransi hari yang persis. Tidak boleh memasukkan BB akhir tanpa tanggal ke W2/W4/W8.
5. Setiap API metric mengembalikan `numerator`, `denominator`, `value`, `cohort`, `endpoint`, `cutoff`, `formulaVersion`, `exclusionCounts`, `dataStatus`. Hitung tingkat kabupaten sebagai **SUM numerator/SUM denominator**, bukan rata-rata persen Puskesmas.
6. Satu periode upload dapat berisi episode Juni dan follow-up Juli–Desember. Tren **kohort mulai** dan tren **tanggal observasi** adalah dua seri berbeda. Jangan menjumlah ulang satu episode karena masuk di beberapa unggahan.

## 5. DQA dan eligibility

| Flag | Rule | Tindakan |
|---|---|---|
| `PARSE_BAD` | Tanggal/angka/NIK tidak valid, placeholder, teks bercampur unit | Simpan raw; exclude field terkait; status issue. |
| `DUPLICATE_OR_CONFLICT` | Orang/indikasi/siklus berulang atau lintas file | Identifikasi snapshot sama vs episode baru; antrekan adjudikasi. |
| `CHILD_Z_FLAG` | WAZ di luar [-6,+5], HAZ di luar [-6,+6], WHZ di luar [-5,+5] pada awal/akhir | Menurut kriteria pembersihan slide balita; nilai outlier tidak masuk metrik indeks terkait. |
| `CHILD_DELTA_Z` | Kenaikan ΔWHZ atau ΔWAZ >1,5 W4 atau >2,0 W8 | Hanya jika checkpoint bertanggal; penurunan ekstrem juga ditandai untuk pemeriksaan. |
| `PREG_SLIDE_SENSITIVITY` | BB titik bulan di luar 40–120 kg atau perubahan absolut antarbulan >20 kg | Analisis yang mereplikasi slide bumil; jangan anggap BB <40 kg otomatis tak valid secara klinis. Keluarkan titik yang bermasalah, bukan seluruh orang. |
| `TEMPORAL` | Akhir ≤ awal, waktu ukur melampaui cutoff, usia anak tidak masuk rentang target, pengukuran sebelum lahir | Tahan rumus yang memerlukan durasi. |
| `TARGET_MISMATCH` | GK baseline WHZ normal, UW WAZ normal/WHZ wasting, T baseline N atau status gizi tak cocok | Matriks klaim ekspor × status terverifikasi. T dua kali timbang sebelum intervensi **tidak dapat dipastikan** dari ekspor saat ini. |
| `STATUS_CONFLICT` | Bumil `Selesai` tanpa BB akhir, `Sesuai` tanpa pengukuran, akhir terisi namun status `-` | Flag dan tampilkan, jangan catat sebagai sukses. |

Severity `block`, `needs_review`, `info`. Waterfall DQA: baris raw → identitas sah → tepat sasaran → baseline valid → follow-up valid → jendela evaluasi valid. Revisi raw melalui upload baru atau adjudikasi dengan user, waktu, alasan, dan versi aturan. Metrik lain dari subjek yang sama tetap dapat dihitung jika field yang dibutuhkan valid.

## 6. Registry formula balita

Notasi: `B` baseline, `E` endpoint dalam jendela, `N(predicate)` jumlah **episode**, `pct(n,d)=100*n/d` jika `d>0`, jika tidak `null`. Pengujian threshold memakai presisi penuh; pembulatan hanya tampilan. Penetapan z-score WHO harus menggunakan tabel/algoritme yang tervalidasi berdasarkan umur, jenis kelamin dan cara ukur; [tabel WHO untuk weight-for-length/height](https://www.who.int/tools/child-growth-standards/standards/weight-for-length-height). Jangan mengestimasi z-score dari rumus linear sederhana.

| Metric ID | Numerator / formula | Denominator, batas |
|---|---|---|
| `appropriate_gk` | `N(indication=gk ∧ -5≤WHZ_B< -2)` | Semua episode GK dengan baseline WHZ valid; pisahkan gizi buruk berat untuk tindak lanjut klinis. |
| `appropriate_uw` | `N(indication=uw ∧ -6≤WAZ_B< -2 ∧ WHZ_B> -2)` | UW dengan WAZ dan WHZ baseline valid. Nilai tepat -2 masuk kasus batas; aturan operasional harus ditetapkan. |
| `appropriate_t_verified` | `N(indication=t ∧ WAZ_B> -2 ∧ WHZ_B> -2 ∧ dua kunjungan sebelumnya menunjukkan tidak naik)` | Episode T dengan riwayat lengkap; pada file contoh **belum terverifikasi**. Tampilkan proxy `status pertumbuhan awal=T` terpisah. |
| `retention_wk` | `N(mature Wk ∧ observasi valid pada Wk)` | `N(mature Wk)`; bukan angka kesembuhan. |
| `recovery_gk_w8` | `N(eligible GK ∧ evaluable W8 ∧ WHZ_E> -2)` | `N(eligible GK ∧ evaluable W8)`. Slide menyebut 4–8 minggu, lampiran durasi minimal 8; jelaskan variasi definisi. |
| `recovery_uw_w4` | `N(eligible UW ∧ evaluable W4 ∧ WAZ_E> -2)` | `N(eligible UW ∧ evaluable W4)`. |
| `response_t_w2` | `N(eligible T ∧ evaluable W2 ∧ WAZ_E-WAZ_B>0.1)` | `N(eligible T ∧ evaluable W2)`; status N/T sumber adalah indikator lain. |
| `delta_z` | `z_E-z_B`; median, IQR, rerata individual | Pasangan awal-akhir valid pada indeks terkait; jangan mengurangkan rerata dua sampel yang komposisinya berbeda. |
| `gain_g_kg_week` | `1000*(BB_E-BB_B)/BB_B * 7/(days_E-days_B)` | BB_B>0, dua **tanggal timbang** sah, durasi>0. Contoh ekspor: **tidak tersedia**. |
| `conservative_success` | `N(mature eligible ∧ observed success)` | `N(mature eligible)`, dengan follow-up hilang dianggap belum sukses **hanya pada analisis sensitivitas**. Tampilkan berdampingan observed-case dan missingness. |

Tampilkan matriks transisi kategori awal→akhir sebagai **hasil awal–akhir tanpa jendela** jika waktu akhir tidak diketahui. Distribusi z awal/akhir berpasangan, stratifikasi baseline stunting HAZ<-2 vs tidak stunting HAZ≥-2, umur, jenis kelamin, fasilitas, siklus; status HAZ invalid adalah kategori ketiga. Grafik W2/W4/W8 baru muncul saat data longitudinal ada. Proporsi wilayah diberi `n/N`; Wilson CI 95% deskriptif berguna terutama n kecil. Beda strata bukan bukti perbedaan efek setelah faktor pembaur/attrition tidak dikendalikan.

## 7. Registry formula ibu hamil

| Metric ID | Formula | Prasyarat dan interpretasi |
|---|---|---|
| `delta_weight_kg` | `BB_akhir-BB_awal` | Dua berat valid; deskriptif, pisahkan KEK dan risiko KEK serta status selesai. |
| `pmt_duration_reported_weeks` | `(tanggal_selesai_PMT-tanggal_mulai_PMT)/7` | Durasi administrasi, **bukan** jarak antar timbang. |
| `observed_weight_gain_week` | `(BB_timbang_akhir-BB_timbang_awal)/((tanggal_timbang_akhir-tanggal_timbang_awal)/7)` | Dua tanggal timbang wajib; bernilai null dari contoh. Jangan otomatis pakai tanggal PMT. |
| `monthly_gain_m` | `(BB_W(4m)-BB_W(4m-4))/4` kg/minggu, m=1..4 | Pasangan checkpoint W0/4/8/12/16 berurutan, BB 40–120 dan perubahan per bulan ±20 untuk mereplikasi cleaning slide. |
| `mean_gain_individual` | `(BB_last-BB_W0)/(4*k)`, k=1..4 bulan berurutan lengkap | Tidak sama dengan rerata lintas kelompok tiap bulan bila denominator berubah. |
| `meeting_half_kg` | `N(mean_gain_individual≥0.5)/N(mean_gain_individual valid)` | Sasaran rujukan slide untuk IMT prahamil kurus trimester II/III; trimester I dilaporkan tersendiri, jangan memaksakan ambang. |
| `trimester_start` | I ≤12, II 13–24, III >24 minggu gestasi pada mulai PMT | Variabel tidak ada pada contoh; tidak dapat diinfer dari umur ibu/tanggal selesai. |
| `complete_months` | Jumlah checkpoint berurutan valid mulai W0 hingga W4/8/12/16, maksimum 4 | `Jumlah Pemantauan` bukan nilai k. |
| `bblr_rate` | `N(BB lahir<2500 gram)/N(kelahiran dengan BB lahir valid)` | Butuh outcome kelahiran tertaut; prematur <37 minggu, jenis kelamin bayi, dan kovariat lain baru dianalisis setelah tersedia. |

Slide 2025 memuat regresi per durasi: kelompok 4 bulan mempunyai OR BBLR 1,50 (CI 95% 1,05–2,15) untuk kenaikan BB tidak sesuai setelah penyesuaian; prematuritas prediktor lebih kuat. Angka ini **bukan prediksi pasien Malang**. Modul regresi/PAF lokal tidak otomatis aktif: memerlukan protokol ilmiah, kelayakan N dan kelengkapan kovariat; asosiasi tidak boleh dilabeli sebab-akibat. Waterfall W0/W4/W8/W12/W16 menampilkan jumlah tersedia dibanding seluruh intake dan dibanding yang sudah melewati jendela.

## 8. Benchmark presentasi Kemenkes 2025

| Kelompok | Referensi nasional | Aturan hasil dalam slide/lampiran | Kondisi perbandingan |
|---|---:|---|---|
| GK | 59,8%, n=86.102 | WHZ menjadi >-2, hasil 4–8 minggu; ringkasan mensyaratkan durasi 8 minggu. | Bandingkan hanya dengan kohort, eligibility, dan endpoint yang sepadan. |
| UW | 38,9%, n=150.513 | WAZ menjadi >-2, hasil 2–4 minggu, durasi 4 minggu. | Sama. |
| T | 43,2%, sekitar n=279 ribu | ΔWAZ>0,1, hasil 1–2 minggu, durasi 2 minggu. | Perlu dua timbang awal dan follow-up bertanggal; N pada slide tidak konsisten. |
| Bumil KEK | 53,6%, n=19.884 pada distribusi individu | Rata-rata kenaikan individu ≥0,5 kg/minggu selama PMT. | Perlu trimester saat mulai dan checkpoint valid. |

Benchmark adalah pembanding **deskriptif 2025**, bukan target kinerja resmi Malang 2026. Chart memberi garis referensi hanya jika definisi setara; jika tidak, kotak penjelasan `Tidak sebanding langsung`. Simpan judul PDF, tahun, nomor slide, ukuran N, definisi, serta catatan inkonsistensi. Nilai ketepatan sasaran dan pembersihan data pada slide tidak boleh diekstrapolasi ke Malang tanpa penghitungan lokal.

## 9. UI Dashboard sesuai screenshot Indikator Ibu Hamil

Screenshot yang disematkan memakai header terang, aksen ungu, waktu pembaruan, dua tab utama, filter periode/wilayah, subtab analisis, panel definisi formula, kartu KPI, grafik batang wilayah dengan distribusi, tren dan tabel rekap. Reuse pola dan komponen RCS.

**Breadcrumb:** Dashboard / Analisis PMT Lokal.  
**Tab primer:** `Kelengkapan Data & DQA` dan `Analisis PMT Lokal`.  
**Subtab:** Ringkasan; Balita Gizi Kurang; Balita BB Kurang; Balita T; Ibu Hamil KEK/Risiko KEK; Analisis Lanjutan (disabled bila variabel tidak cukup).

1. Header menyebut kohort, tanggal cutoff **pengukuran**, waktu unggah terakhir, jumlah fasilitas terwakili dan badge `data parsial` bila perlu.
2. Filter tahun, bulan **mulai PMT** atau **pengukuran awal (proksi)**, cutoff, fasilitas, desa, indikasi, siklus, stunting, status selesai. Jangan memberi label akhir Desember pada data September.
3. Panel “Definisi Operasional & Formula” menunjukkan eligibility, jendela, numerator, denominator, exclusion count, versi metodologi dan status: `Tersedia`, `Proksi`, `Butuh data longitudinal`.
4. Kartu: orang unik, episode, sasaran sesuai, pemantauan valid, selesai bila diketahui, pulih/merespons **terukur**, belum evaluable, issue kritis. Kartu menyajikan `n/N`, periode, dan label keterbatasan.
5. Funnel kohort; transisi kategori awal–akhir; distribusi z paired. Titik W2/W4/W8 dan W0–W16 hanya ada setelah upload data longitudinal.
6. Batang per Puskesmas dengan `n/N`, CI bila dihitung dan drill desa, panel distribusi/median/rentang di samping. Fasilitas dengan n kecil tidak ditampilkan sebagai peringkat kinerja tanpa badge ketidakpastian.
7. Tren terpisah `bulan intake` dan `bulan observasi`; arsir kohort belum mature. Jangan menghasilkan kenaikan semu dari akumulasi snapshot upload.
8. Tabel Puskesmas→desa: intake, eligible, evaluable, berhasil, %, kehilangan follow-up, flag DQA, selisih terhadap rekap administratif, pencarian dan ekspor.
9. Tab DQA menampilkan empat sumber, mapping, duplikasi, nilai ekstrem, missing follow-up, ketidaktepatan sasaran serta revisi historis.

**Insight rule-based:** “X/Y episode GK evaluable berhasil pada W8”; “Z% observasi akhir balita belum bertanggal”; “Perbedaan capaian menurut stunting bersifat deskriptif”; “Analisis trimester ibu hamil menunggu usia kehamilan saat mulai”. Setiap kalimat disertai N, cutoff, dan sumber; tidak menyimpulkan PMT menyebabkan perubahan atau membuat instruksi klinis otomatis.

## 10. Arsitektur implementasi untuk Antigravity

```text
Upload → Deteksi format HTML/XLS/XLSX → Raw immutable + hash
       → Validasi skema + normalisasi wilayah
       → Identitas / episode / snapshot bertanggal
       → DQA field dan episode
       → Formula registry terversi
       → Agregat per cohort/cutoff/wilayah
       → API berizin → kartu, chart, tabel dan drill-down
```

Parser HTML aman untuk disguised .xls dan parser binary untuk XLS/XLSX sungguhan; batasi ukuran, sanitasi markup, tolak formula injection pada CSV ekspor. Preview mapping hanya untuk role petugas; NIK dimask. Background job menampilkan accepted/review/rejected dan rollback versi batch. Timestamp UTC di DB, zona `Asia/Jakarta` di UI. Seluruh business logic di server/shared service, bukan React. Cache keyed oleh batch set hash + versi rumus + kohort + cutoff + filter.

**API konseptual:** `POST /api/pmt/uploads`, `GET /api/pmt/uploads/:id/quality`, `GET /api/pmt/summary`, `GET /api/pmt/series`, `GET /api/pmt/facilities`, `GET /api/pmt/episodes/:id` khusus role, `GET /api/pmt/formulas`, `GET /api/pmt/export`. RLS menurut peran dan wilayah, audit akses, PII terenkripsi, NIK tidak muncul pada URL/log/chart, pembatasan sel kecil pada tampilan publik dan ekspor menurut kebijakan organisasi.

```ts
type MetricDef = {
  id: string; version: string; group: 'gk'|'uw'|'t'|'pregnant';
  source: string; endpoint: string; eligibleRule: string;
  numeratorRule?: string; denominatorRule?: string;
  requiredFields: string[];
  status: 'available'|'proxy'|'requires_longitudinal'|'not_applicable';
};

const percent = (n: number, d: number): number | null =>
  d > 0 ? 100 * n / d : null;

const childGainGPerKgWeek = (
  initialKg: number, finalKg: number, elapsedDays: number
): number | null =>
  initialKg > 0 && elapsedDays > 0
    ? 1000 * (finalKg - initialKg) / initialKg * 7 / elapsedDays
    : null;
```

### 10.1 Fase rilis

| Fase | Hasil/gate |
|---|---|
| MVP 1: sumber saat ini | Impor keempat skema HTML .xls, identitas dan versi, DQA, awal–akhir balita, deskriptif bumil, rekonsiliasi; semua hasil titik minggu yang tak didukung null dengan alasan. |
| MVP 2: upload longitudinal | Template kunjungan bertanggal, W2/W4/W8 dan W0/W4/W8/W12/W16, kohort mature/evaluable, missingness, tren; endpoint disahkan pengelola program. |
| MVP 3: analisis ilmiah | Interval ketidakpastian, stratifikasi dan pembaur; link persalinan serta model BBLR jika data, protokol, dan ukuran sampel mencukupi. |

## 11. Uji penerimaan minimum

1. Impor pertama membaca tepat 460 GK + 604 UW + 2.266 T + 29 bumil = **3.359 baris raw**; dashboard tidak menyebut 3.359 orang unik. Impor ulang file identik tidak menggandakan episode.
2. Duplikat intra-file serta 5 NIK overlap T–UW terdeteksi tanpa menampilkan NIK utuh.
3. `999.99`, nilai antropometri ekstrem dan teks `83..9`/`10.7 it` di-flag; raw tetap tersimpan, statistik terkait tidak mencakupnya.
4. GK WHZ awal -2,18 → akhir -2,01 belum berhasil pada batas `> -2`; -2,15 → -1,48 berhasil pada **panel awal–akhir** tetapi bukan otomatis di W8.
5. Tanpa tanggal akhir balita, `gain_g_kg_week` dan W2/W4/W8 semuanya `null`. Tanpa usia kehamilan dan checkpoint bumil, target per trimester/bulan `null`. Status selesai tanpa BB akhir terdeteksi.
6. Dengan anak W0 8 kg, W4 8,8 kg, durasi tepat 28 hari: `1000×0,8/8×7/28=25 g/kgBB/minggu`. Ibu W0 45 kg, W4 47 kg: 0,5 kg/minggu, dievaluasi hanya bila strata target tepat.
7. Wilayah A 8/10=80% dan B 1/2=50% menghasilkan kabupaten 9/12=75%, **bukan** rerata 65%.
8. Kohort baru Desember tidak dievaluasi W8 sebelum mature; revisi setelah cutoff tidak mengubah angka historis kecuali koreksi data yang memang berlaku sebelum cutoff, dengan audit.
9. Ekspor agregat membawa `n/N`, cutoff, versi rumus, alasan eksklusi dan catatan kesetaraan benchmark.

## 12. Keputusan klinis/metodologis yang harus disahkan

- Toleransi jendela W2/W4/W8 dan penanganan nilai tepat -2; PDF menyebut `> -2`, sedangkan aturan operasional dapat memiliki konvensi batas yang berbeda.
- Definisi kode status N/T/O/B, validitas dua kali timbang untuk T, dan perlakuan gizi buruk dalam kohort GK.
- Cara mendapat tanggal pengukuran akhir balita, status selesai dan pengukuran per kunjungan dari sumber EPPGBM.
- Pembedaan KEK dan risiko KEK, trimester I, siklus ulang, serta tanggal timbang bumil.
- Verifikasi ketidakkonsistenan ukuran sampel pada PDF sebelum perbandingan eksternal.

Persetujuan definisi ini menjadi **gate penerbitan indikator klinis**, sementara MVP deskriptif dan DQA dapat dibangun dari data yang tersedia.
