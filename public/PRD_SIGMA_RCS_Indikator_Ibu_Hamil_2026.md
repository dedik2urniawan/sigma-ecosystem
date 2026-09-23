# PRD — SIGMA RCS: Modul Analisis Indikator Ibu Hamil

**Dokumen:** Product Requirements Document (PRD)  
**Produk:** SIGMA RCS / SIGMA Ecosystem  
**Modul:** Analisis Indikator Ibu Hamil  
**Versi PRD:** 1.0  
**Baseline indikator:** Guidance Sigizi Kesga Update 2026  
**Status:** Implementation-ready untuk Agentic AI IDE / Antigravity  
**Target stack SIGMA:** Next.js App Router + TypeScript + Tailwind CSS + Supabase/PostgreSQL  
**Tanggal penyusunan:** 19 September 2026  

---

## 1. Ringkasan Eksekutif

Modul **Analisis Indikator Ibu Hamil** pada SIGMA RCS adalah dashboard analitik untuk menerima source data primer hasil ekspor/entry indikator ibu hamil, melakukan validasi kualitas data, membentuk agregasi level Desa/Kelurahan → Puskesmas → Kabupaten, menghitung indikator capaian sesuai guidance 2026, serta menyajikan scorecard, grafik per Puskesmas, tren, tabel rekapitulasi, dan insight data.

Modul harus mempertahankan pola UX yang telah digunakan pada dashboard **Balita Gizi**, yaitu:

1. header modul dan waktu pembaruan data;
2. pemisahan tab **Kelengkapan Data Laporan** dan **Analisis Indikator**;
3. kontrol periode/tahun/Puskesmas/Desa;
4. panel **Definisi Operasional & Formula**;
5. scorecard indikator;
6. legenda/metadata numerator-denominator;
7. grafik capaian per Puskesmas;
8. rekapitulasi detail;
9. grafik tren;
10. integrasi Data Quality Assessment (DQA).

PRD ini juga menetapkan secara eksplisit bahwa laporan **bulanan** dan **triwulanan (TW)** tidak memakai algoritma agregasi yang sama dalam memilih record desa.

- **Bulanan:** hanya record pada bulan yang dipilih.
- **Triwulanan:** menggunakan **latest available cumulative snapshot per desa sampai cutoff TW**, kemudian dijumlahkan.
- Persentase selalu dihitung ulang menggunakan **ratio of sums**, bukan rata-rata persentase desa/Puskesmas.
- Source data merupakan nilai **kumulatif sampai bulan ini**, sehingga tidak boleh menjumlahkan snapshot Januari + Februari + Maret untuk membentuk TW I.

---

# 2. Sumber Acuan dan Hierarki Keputusan

PRD dibangun dari lima sumber berikut:

1. **Daftar entry Indikator Ibu hamil.xlsx**  
   Source primer level Desa/Kelurahan, seluruh bulan, seluruh Puskesmas.

2. **Laporan Bulan Februari Indikator Ibu hamil.xlsx**  
   Acuan reverse-engineering agregasi laporan bulanan.

3. **Laporan Tahunan TW II Indikator Ibu Hamil.xlsx**  
   Acuan reverse-engineering agregasi laporan TW.

4. **SS dari SIGMA RCS Indikator Balita Gizi.pdf**  
   Acuan pola informasi, layout, scorecard, chart, tabel, tren, dan definisi formula pada modul RCS yang sudah berjalan.

5. **V2 Pendalaman Indikator Ibu Hamil 2026.pdf**  
   Acuan utama definisi operasional, numerator, denominator, target 2026, dan business rule indikator.

## 2.1 Prioritas jika terdapat perbedaan antar sumber

Gunakan urutan keputusan:

### A. Definisi indikator, numerator, denominator, target
**Guidance 2026 menjadi sumber utama.**

### B. Struktur raw variable dan perilaku data source
Gunakan **Daftar Entry SIGIZI**.

### C. Algoritma agregasi laporan
Gunakan hasil reverse-engineering **Laporan Bulanan + Laporan TW**.

### D. User experience/dashboard pattern
Gunakan desain **SIGMA RCS Balita Gizi** sebagai reusable design pattern.

---

# 3. Temuan Penting yang Harus Menjadi Business Rule

## 3.1 Semua nilai utama adalah cumulative snapshot

Banyak field memiliki label:

> "sampai bulan ini"

Artinya angka pada Februari, Maret, April, dst. adalah state kumulatif pada bulan tersebut, bukan kejadian eksklusif bulan itu.

Implikasi:

```text
SALAH:
TW I = Januari + Februari + Maret

BENAR:
TW I = snapshot terakhir tiap desa sampai Maret
```

---

## 3.2 Algoritma laporan bulanan

Untuk periode bulanan:

```text
filter Tahun = selected_year
filter Bulan = selected_month
group by Puskesmas
SUM seluruh Desa/Kelurahan yang benar-benar mempunyai record bulan tersebut
```

Tidak dilakukan carry-forward dari bulan sebelumnya.

Formula umum:

```text
MONTHLY_COUNT(pusk, indicator, month) =
SUM(indicator)
WHERE year = selected_year
  AND month = selected_month
  AND puskesmas = selected_puskesmas
```

Untuk Kabupaten:

```text
MONTHLY_COUNT(kabupaten) =
SUM(MONTHLY_COUNT seluruh puskesmas)
```

---

## 3.3 Algoritma laporan triwulan

Cutoff:

| TW | Cutoff Bulan |
|---|---|
| TW I | Maret (3) |
| TW II | Juni (6) |
| TW III | September (9) |
| TW IV | Desember (12) |

Untuk setiap Desa/Kelurahan:

```text
1. filter year = selected_year
2. filter month_number <= quarter_cutoff
3. urutkan month_number DESC
4. jika terdapat revisi pada bulan sama, urutkan waktu_input DESC
5. ambil satu record terakhir
```

Kemudian:

```text
TW_COUNT(pusk, indicator) =
SUM(latest_available_indicator_per_desa)
```

SQL-like:

```sql
WITH latest_snapshot AS (
    SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY tahun, puskesmas_id, desa_id
            ORDER BY month_number DESC, waktu_input DESC
        ) AS rn
    FROM bumil_entries
    WHERE tahun = :year
      AND month_number <= :quarter_cutoff
)
SELECT
    puskesmas_id,
    SUM(hb_checked) AS hb_checked,
    SUM(anemia_mild) AS anemia_mild,
    ...
FROM latest_snapshot
WHERE rn = 1
GROUP BY puskesmas_id;
```

### Catatan penting

TW II dapat menggunakan:

- Juni bila tersedia;
- Mei bila Juni belum tersedia;
- April bila Mei/Juni belum tersedia;
- bahkan Maret bila belum terdapat update April–Juni.

Karena itu dashboard TW wajib mempunyai indikator **freshness/carry-forward**.

---

## 3.4 Persentase tidak boleh dijumlah atau dirata-rata

Gunakan:

```text
percentage =
SUM(numerator) / SUM(denominator) * 100
```

Jangan:

```text
AVG(persentase_desa)
SUM(persentase_desa)
AVG(persentase_puskesmas)
```

Kabupaten juga dihitung dari ratio total numerator dan denominator Kabupaten.

---

# 4. Scope Produk

## 4.1 In scope

Modul harus mendukung:

- upload Excel source indikator ibu hamil;
- mapping field otomatis;
- validasi schema;
- DQA;
- filtering wilayah dan periode;
- agregasi bulanan;
- agregasi TW I–IV;
- indikator program 2026;
- indikator monitoring ANC;
- raw supporting counts;
- target comparison;
- scorecard;
- chart per Puskesmas;
- trend;
- tabel rekap;
- drill-down Puskesmas → Desa;
- kelengkapan laporan;
- data freshness TW;
- export hasil;
- AI-generated analytic narrative berbasis hasil kalkulasi.

## 4.2 Out of scope

Untuk versi pertama:

- clinical decision support individu;
- diagnosis ibu hamil;
- rekomendasi obat/dosis;
- automatic correction source tanpa persetujuan user;
- deduplikasi individual lintas fasilitas tanpa unique patient identifier;
- menggantikan SIGIZI sebagai sistem sumber nasional.

---

# 5. Struktur Navigasi Modul

Route yang direkomendasikan:

```text
/dashboard/ibu-hamil
```

Sub-view:

```text
/dashboard/ibu-hamil?view=completeness
/dashboard/ibu-hamil?view=analytics
```

Domain:

```text
domain=overview
domain=anemia
domain=supplementation
domain=kek
domain=anc
```

---

# 6. Header Dashboard

## 6.1 Header utama

Icon:

```text
pregnant_woman
```

Title:

```text
Ibu Hamil
```

Subtitle:

> Monitoring anemia, suplementasi gizi, KEK, pemeriksaan kehamilan, kualitas data, dan kepatuhan pelaporan.

Metadata:

```text
Data terakhir diperbarui:
DD MMMM YYYY pukul HH.mm
```

---

# 7. Main Navigation Dashboard

Gunakan dua primary tab mengikuti pola Balita Gizi:

### Tab 1 — Kelengkapan Data Laporan

Icon:

```text
fact_check
```

### Tab 2 — Analisis Indikator Ibu Hamil

Icon:

```text
analytics
```

Pada tab analytics, tampilkan secondary domain tabs:

1. **Ringkasan**
2. **Anemia**
3. **Suplementasi Gizi**
4. **KEK & PMT**
5. **Pemeriksaan Kehamilan / ANC**

---

# 8. Global Filter

Filter harus sticky/persist selama user berpindah tab.

## 8.1 Mode laporan

```text
Bulanan
Triwulanan
```

Jika Bulanan:

```text
Bulan:
Januari ... Desember
```

Jika Triwulanan:

```text
TW I
TW II
TW III
TW IV
```

## 8.2 Filter tambahan

```text
Tahun
Puskesmas
Desa/Kelurahan
```

Default:

```text
Tahun = tahun aktif
Puskesmas = Semua Puskesmas
Desa = Semua Desa/Kelurahan
```

Jika Puskesmas berubah, daftar Desa harus dependent/filter terhadap Puskesmas.

---

# 9. Data Input Template

Template upload RCS harus mempunyai canonical field berikut.

## 9.1 Identity fields

| Display | Field |
|---|---|
| Tahun | `tahun` |
| Kab/Kota | `kab_kota` |
| Kecamatan | `kecamatan` |
| Puskesmas | `puskesmas` |
| Kelurahan/Desa | `desa` |
| Bulan | `bulan` |
| Waktu Input | `waktu_input` |

`tahun` wajib tersedia walaupun pada source lama belum eksplisit.

---

## 9.2 Raw indicator fields

| No | Display | Technical Key |
|---:|---|---|
| 1 | Jumlah ibu hamil periksa Hb sampai bulan ini | `hb_checked` |
| 2 | Anemia ringan (10–10.9 g/dl) | `anemia_mild` |
| 3 | Anemia sedang (7–9.9 g/dl) | `anemia_moderate` |
| 4 | Anemia berat (<7 g/dl) | `anemia_severe` |
| 5 | Jumlah ibu hamil anemia sampai bulan ini | `anemia_total_uploaded` |
| 6 | Anemia ringan mendapat TTD oral | `anemia_mild_ttd` |
| 7 | Anemia sedang/berat mendapat tata laksana tingkat lanjutan | `anemia_modsev_advanced` |
| 8 | Jumlah Sasaran Ibu Hamil | `target_pregnant` |
| 9 | Mendapat minimal 180 tablet MMS | `received_mms_180` |
| 10 | Mendapat minimal 180 tablet TTD | `received_ttd_180` |
| 11 | Mendapat suplementasi gizi | `received_supplement_total_uploaded` |
| 12 | Mengonsumsi minimal 180 tablet MMS | `consumed_mms_180` |
| 13 | Mengonsumsi minimal 180 tablet TTD | `consumed_ttd_180` |
| 14 | Mengonsumsi suplementasi gizi | `consumed_supplement_total_uploaded` |
| 15 | Diukur LILA dan/atau IMT | `lila_imt_measured` |
| 16 | Risiko KEK/KEK | `kek_risk` |
| 17 | Sasaran bumil KEK ditatalaksana | `kek_management_target` |
| 18 | KEK mendapat makanan tambahan | `kek_received_pmt` |
| 19 | Jumlah ibu hamil sampai bulan ini | `pregnant_total` |
| 20 | Jumlah ibu bersalin sampai bulan ini | `delivery_total` |
| 21 | K1 akses | `k1_access` |
| 22 | K1 murni | `k1_pure` |
| 23 | ANC TM1 dengan Dokter | `anc_t1_doctor` |
| 24 | ANC TM1 dengan USG | `anc_t1_usg` |
| 25 | ANC TM3 dengan Dokter | `anc_t3_doctor` |
| 26 | ANC TM3 dengan USG | `anc_t3_usg` |
| 27 | Ibu bersalin K6 | `k6_delivery` |
| 28 | Ibu bersalin mendapat pemeriksaan 12T | `anc_12t_delivery` |

---

# 10. Master Data yang Diperlukan

Source upload tidak boleh menjadi satu-satunya referensi denominator.

## 10.1 Master wilayah

Table:

```text
master_wilayah
```

Field minimal:

```text
kab_kota_id
kecamatan_id
puskesmas_id
desa_id
desa_name
active
```

Digunakan untuk:

- jumlah desa resmi;
- kelengkapan laporan;
- validasi nama wilayah;
- dependent dropdown.

---

## 10.2 Master sasaran

Table:

```text
master_sasaran_bumil
```

Field:

```text
tahun
puskesmas_id
desa_id nullable
target_pregnant
target_delivery
source
effective_date
```

`target_delivery` diperlukan untuk indikator:

- K6;
- 12T.

---

# 11. Derived Count

Jangan mempercayai total upload secara buta.

## 11.1 Total anemia

```text
anemia_total =
anemia_mild
+ anemia_moderate
+ anemia_severe
```

Validation:

```text
anemia_total_uploaded != anemia_total
→ DQA_WARNING_ANEMIA_TOTAL
```

---

## 11.2 Total mendapat suplementasi

Observed SIGIZI source:

```text
received_supplement_total =
received_mms_180
+ received_ttd_180
```

Validation:

```text
received_supplement_total_uploaded
!= received_supplement_total
→ DQA_WARNING_RECEIVED_SUPPLEMENT_TOTAL
```

### Important semantic note

Guidance menggunakan istilah TTD **atau** MMS. Implementasi penjumlahan aman hanya bila upstream menjamin kategori tidak overlap.

Untuk kompatibilitas dengan export SIGIZI saat ini, gunakan hasil penjumlahan sebagai default **source-replication logic**, tetapi beri metadata:

```text
aggregation_semantics = "SUM_COMPONENTS_AS_EXPORTED"
```

Jika di masa depan tersedia unique patient ID, kalkulasi dapat diubah menjadi union unique mother.

---

## 11.3 Total konsumsi suplementasi

```text
consumed_supplement_total =
consumed_mms_180
+ consumed_ttd_180
```

Validation:

```text
consumed_supplement_total_uploaded
!= consumed_supplement_total
→ DQA_WARNING_CONSUMED_SUPPLEMENT_TOTAL
```

---

# 12. Indicator Taxonomy

Dashboard dibagi menjadi empat domain.

---

# DOMAIN A — ANEMIA

## A1. Persentase Anemia pada Ibu Hamil

**Type:** Program Indicator 2026  
**Direction:** Lower is better  
**Target:** ≤ 25%

Definisi:

> Persentase ibu hamil yang termasuk kategori anemia dengan hasil Hb <11 g/dl pada kurun waktu tertentu di wilayah kerja.

Numerator:

```text
anemia_total
```

Denominator:

```text
hb_checked
```

Formula:

```text
pct_anemia =
SAFE_PERCENT(anemia_total, hb_checked)
```

atau:

```text
(anemia_mild + anemia_moderate + anemia_severe)
/ hb_checked
* 100
```

Sub-indicator:

```text
Anemia ringan
Anemia sedang
Anemia berat
```

Scorecard title:

```text
% Ibu Hamil Anemia
```

Scorecard supporting values:

```text
Anemia: n
Periksa Hb: N
Target: ≤25%
```

---

## A2. Persentase Ibu Hamil Anemia Ringan Mendapat TTD Oral

**Type:** Program Indicator 2026  
**Direction:** Higher is better  
**Target:** ≥ 50%

Numerator:

```text
anemia_mild_ttd
```

Denominator:

```text
anemia_mild
```

Formula:

```text
pct_anemia_mild_ttd =
SAFE_PERCENT(anemia_mild_ttd, anemia_mild)
```

Scorecard supporting values:

```text
Mendapat TTD: n
Anemia ringan: N
Target: ≥50%
```

---

## A3. Persentase Ibu Hamil Anemia Sedang/Berat Mendapat Tatalaksana Tingkat Lanjutan

**Type:** Program Indicator 2026  
**Direction:** Higher is better  
**Target:** ≥ 50%

Numerator:

```text
anemia_modsev_advanced
```

Denominator:

```text
anemia_moderate + anemia_severe
```

Formula:

```text
pct_anemia_modsev_advanced =
SAFE_PERCENT(
  anemia_modsev_advanced,
  anemia_moderate + anemia_severe
)
```

Tatalaksana dapat mencakup tatalaksana lanjutan sesuai penyebab seperti Fe parenteral, transfusi darah, atau tatalaksana lain sesuai clinical pathway.

---

# DOMAIN B — SUPLEMENTASI GIZI

## B1. Persentase Ibu Hamil Mendapat Suplementasi Gizi

**Type:** Program Indicator 2026  
**Direction:** Higher is better  
**Target:** ≥ 92%

Numerator:

```text
received_supplement_total
```

Denominator:

```text
target_pregnant
```

Formula:

```text
pct_received_supplement =
SAFE_PERCENT(
  received_supplement_total,
  target_pregnant
)
```

Sub-indicator:

```text
Mendapat ≥180 TTD
Mendapat ≥180 MMS
```

MMS hanya relevan pada daerah/lokus sesuai kebijakan tahun berjalan.

---

## B2. Persentase Ibu Hamil Mengonsumsi Suplementasi Gizi

**Type:** Program Indicator 2026  
**Direction:** Higher is better  
**Target:** ≥ 52%

### Guidance 2026 formula

Numerator:

```text
consumed_supplement_total
```

Denominator:

```text
target_pregnant
```

Formula:

```text
pct_consumed_supplement_guidance_2026 =
SAFE_PERCENT(
  consumed_supplement_total,
  target_pregnant
)
```

### Compatibility issue dengan export SIGIZI yang dianalisis

Export laporan yang tersedia menempatkan:

```text
Jumlah sasaran ibu bersalin
```

sebagai denominator sebelum indikator konsumsi, dan nilai persentasenya konsisten dengan denominator tersebut.

Karena guidance 2026 secara eksplisit menggunakan **sasaran proyeksi ibu hamil**, maka RCS harus menggunakan **versioned formula profile**.

#### Default profile

```text
GUIDANCE_2026
denominator = target_pregnant
```

#### Audit compatibility profile

```text
LEGACY_SIGIZI_EXPORT
denominator = target_delivery
```

UI production tidak wajib memberikan toggle ke user umum.

Simpan metadata:

```text
formula_profile = "GUIDANCE_2026"
```

Admin/audit dapat menjalankan comparator untuk menjelaskan selisih dengan export SIGIZI lama.

---

# DOMAIN C — KEK DAN PMT

## C1. Persentase Ibu Hamil KEK/Risiko KEK

**Type:** Program Indicator 2026  
**Direction:** Lower is better  
**Target:** ≤ 13%

Kriteria:

```text
IMT pra-hamil / TM1 < 18.5 kg/m²
dan/atau
LILA < 23.5 cm
```

Numerator:

```text
kek_risk
```

Denominator:

```text
lila_imt_measured
```

Formula:

```text
pct_kek =
SAFE_PERCENT(
  kek_risk,
  lila_imt_measured
)
```

---

## C2. Persentase Ibu Hamil KEK Mendapat Makanan Tambahan

**Type:** Program Indicator 2026  
**Direction:** Higher is better  
**Target:** ≥ 85%

Numerator:

```text
kek_received_pmt
```

Denominator:

```text
kek_management_target
```

Formula:

```text
pct_kek_pmt =
SAFE_PERCENT(
  kek_received_pmt,
  kek_management_target
)
```

Business rule denominator 2026:

```text
ibu masih hamil pada 2026
AND terdeteksi KEK/Risiko KEK
AND belum mendapat PMT Lokal pada 2025
```

Ibu yang telah teridentifikasi KEK pada 2025 dan telah mendapat PMT Lokal 2025 tidak dihitung sebagai capaian baru 2026 walaupun pemberian masih berlanjut di 2026.

Field:

```text
kek_management_target
```

harus diperlakukan sebagai denominator authoritative dari laporan program.

---

# DOMAIN D — PEMERIKSAAN KEHAMILAN / ANC

Guidance 2026 mengandung indikator target tambahan yang belum ditampilkan sebagai kolom `%` pada export laporan yang dianalisis.

SIGMA RCS harus menghitungnya sebagai **derived KPIs**.

---

## D0. Supporting Count — Jumlah Ibu Hamil

**Type:** Monitoring  
**Target:** none

```text
pregnant_total
```

Definition:

```text
Jumlah ibu hamil Januari–bulan terkini secara kumulatif,
termasuk kehamilan yang dimulai pada tahun sebelumnya
dan masih berlangsung pada tahun berjalan.
```

---

## D0b. Supporting Count — Jumlah Ibu Bersalin

**Type:** Monitoring  
**Target:** none

```text
delivery_total
```

Definition:

```text
Jumlah ibu bersalin Januari–bulan terkini secara kumulatif.
```

---

## D1. K1 Akses

**Type:** Monitoring / bukan indikator program 2026  
**Target:** none

Field:

```text
k1_access
```

Definition:

```text
ANC pertama kali pada usia kehamilan berapa pun.
```

Tampilkan sebagai count card, bukan scorecard target.

---

## D2. Persentase K1 Murni

**Type:** Program Indicator 2026  
**Direction:** Higher is better  
**Target:** ≥ 89%

Numerator:

```text
k1_pure
```

Denominator:

```text
target_pregnant
```

Formula:

```text
pct_k1_pure =
SAFE_PERCENT(k1_pure, target_pregnant)
```

---

## D3. ANC Trimester 1 dengan Dokter

**Type:** Monitoring / bukan indikator program 2026  
**Target:** none

Field:

```text
anc_t1_doctor
```

Tampilkan sebagai supporting count.

---

## D4. Persentase ANC Trimester 1 dengan USG

**Type:** Program Indicator 2026  
**Direction:** Higher is better  
**Target:** ≥ 85%

Numerator:

```text
anc_t1_usg
```

Denominator:

```text
target_pregnant
```

Formula:

```text
pct_anc_t1_usg =
SAFE_PERCENT(anc_t1_usg, target_pregnant)
```

---

## D5. ANC Trimester 3 dengan Dokter

**Type:** Monitoring / bukan indikator program 2026  
**Target:** none

Field:

```text
anc_t3_doctor
```

---

## D6. Persentase ANC Trimester 3 dengan USG

**Type:** Program Indicator 2026  
**Direction:** Higher is better  
**Target:** ≥ 84%

Numerator:

```text
anc_t3_usg
```

Denominator:

```text
target_pregnant
```

Formula:

```text
pct_anc_t3_usg =
SAFE_PERCENT(anc_t3_usg, target_pregnant)
```

---

## D7. Persentase K6

**Type:** Program Indicator 2026  
**Direction:** Higher is better  
**Target:** ≥ 82%

Numerator:

```text
k6_delivery
```

Denominator:

```text
target_delivery
```

Formula:

```text
pct_k6 =
SAFE_PERCENT(k6_delivery, target_delivery)
```

Definition K6:

```text
ANC minimal 6 kali:
TM1 = 1 kali
TM2 = 2 kali
TM3 = 3 kali
dan diperiksa dokter minimal:
1 kali TM1
1 kali TM3
```

Guidance 2026 menghitung indikator pada ibu yang sudah bersalin.

---

## D8. Persentase Pemeriksaan ANC 12T

**Type:** Program Indicator 2026  
**Direction:** Higher is better  
**Target:** ≥ 66%

Numerator:

```text
anc_12t_delivery
```

Denominator:

```text
target_delivery
```

Formula:

```text
pct_anc_12t =
SAFE_PERCENT(
  anc_12t_delivery,
  target_delivery
)
```

12T meliputi komponen pelayanan antenatal standar sesuai guidance, dan update 2026 dihitung pada ibu yang sudah bersalin.

---

# 13. Daftar Final Scorecard Program 2026

Dashboard ringkasan harus memiliki **12 KPI scorecards**.

| Domain | Scorecard | Target | Direction |
|---|---|---:|---|
| Anemia | % Ibu Hamil Anemia | 25% | ≤ |
| Anemia | % Anemia Ringan Mendapat TTD Oral | 50% | ≥ |
| Anemia | % Anemia Sedang/Berat Ditatalaksana Lanjutan | 50% | ≥ |
| Suplementasi | % Mendapat Suplementasi Gizi | 92% | ≥ |
| Suplementasi | % Mengonsumsi Suplementasi Gizi | 52% | ≥ |
| KEK | % Ibu Hamil KEK/Risiko KEK | 13% | ≤ |
| KEK | % KEK Mendapat Makanan Tambahan | 85% | ≥ |
| ANC | % K1 Murni | 89% | ≥ |
| ANC | % ANC TM1 dengan USG | 85% | ≥ |
| ANC | % ANC TM3 dengan USG | 84% | ≥ |
| ANC | % K6 | 82% | ≥ |
| ANC | % Pemeriksaan ANC 12T | 66% | ≥ |

Supporting cards tanpa target:

```text
Jumlah Ibu Hamil
Jumlah Ibu Bersalin
K1 Akses
ANC TM1 dengan Dokter
ANC TM3 dengan Dokter
```

---

# 14. Safe Percentage Function

Gunakan centralized formula function.

TypeScript:

```ts
export function safePercent(
  numerator: number | null | undefined,
  denominator: number | null | undefined,
): number | null {
  const n = Number(numerator ?? 0);
  const d = Number(denominator ?? 0);

  if (d === 0) return null;

  return Math.round((n / d) * 10000) / 100;
}
```

UI:

```text
denominator = 0
→ tampilkan "N/A"
```

Jangan menampilkan 0% jika denominator tidak ada karena dapat disalahartikan sebagai kinerja nol.

Namun untuk mode comparator SIGIZI, dapat tersedia compatibility rendering:

```text
SIGIZI legacy display:
denominator = 0 → 0%
```

---

# 15. Scorecard Specification

Setiap program scorecard harus mempunyai:

```text
Indicator label
Current value (%)
Target
Status
Numerator
Denominator
Gap terhadap target
Delta vs periode sebelumnya
Mini trend / sparkline optional
Data freshness
```

Contoh:

```text
% Ibu Hamil Anemia
4.67%

Target ≤25%
✓ Target tercapai

Anemia       14
Periksa Hb   300

Gap target: -20.33 pp
vs Jan: ↓ 0.8 pp
```

---

# 16. Status Logic

Hindari threshold arbitrer yang tidak ada di guidance.

Gunakan tiga state:

```text
TARGET_MET
TARGET_NOT_MET
NO_DATA
```

Higher is better:

```ts
status = value >= target
  ? "TARGET_MET"
  : "TARGET_NOT_MET";
```

Lower is better:

```ts
status = value <= target
  ? "TARGET_MET"
  : "TARGET_NOT_MET";
```

No data:

```text
denominator = 0/null
→ NO_DATA
```

---

# 17. Gap to Target

Higher is better:

```text
gap_pp = value - target
```

Lower is better:

```text
gap_pp = target - value
```

Positive gap always berarti posisi menguntungkan terhadap target.

---

# 18. Trend Interpretation

Jangan mewarnai delta hanya berdasarkan plus/minus.

Contoh:

### Higher is better

```text
value naik → positive
value turun → negative
```

### Lower is better

```text
anemia turun → positive
anemia naik → negative
```

Utility:

```ts
function trendDirection(
  current: number,
  previous: number,
  direction: "higher" | "lower"
) {
  const delta = current - previous;

  if (direction === "higher") {
    return delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral";
  }

  return delta < 0 ? "positive" : delta > 0 ? "negative" : "neutral";
}
```

---

# 19. Panel Definisi Operasional & Formula

Mengikuti modul Balita Gizi, sebelum scorecard tampilkan collapsible panel:

```text
Definisi Operasional & Formula Ibu Hamil
```

Pada domain Ringkasan:

```text
collapsed by default
```

Pada domain spesifik:

```text
expanded by default
```

Setiap definition card menampilkan:

```text
Nama indikator
Badge Program 2026 / Monitoring
Definisi operasional
Formula
Numerator
Denominator
Target
Direction
Catatan business rule
```

---

# 20. Scorecard Layout

## 20.1 Ringkasan

Desktop:

```text
4 columns × 3 rows
```

Tablet:

```text
2 columns
```

Mobile:

```text
1 column
```

Urutan:

```text
Anemia
Anemia Ringan TTD
Anemia Sedang/Berat
Mendapat Suplementasi

Mengonsumsi Suplementasi
KEK
KEK Mendapat PMT
K1 Murni

TM1 USG
TM3 USG
K6
12T
```

---

# 21. Domain-Specific Scorecard

## Anemia

Primary scorecards:

```text
% Anemia
% Anemia Ringan Mendapat TTD
% Anemia Sedang/Berat Ditatalaksana
```

Secondary breakdown:

```text
Periksa Hb
Anemia Ringan
Anemia Sedang
Anemia Berat
```

Recommended visual:

```text
severity stacked bar
```

---

## Suplementasi

Primary:

```text
% Mendapat Suplementasi
% Mengonsumsi Suplementasi
```

Breakdown:

```text
Mendapat MMS
Mendapat TTD
Mengonsumsi MMS
Mengonsumsi TTD
```

---

## KEK

Primary:

```text
% KEK/Risiko KEK
% KEK Mendapat PMT
```

Supporting:

```text
Diukur LILA/IMT
KEK/Risiko KEK
Sasaran KEK ditatalaksana
KEK mendapat PMT
```

---

## ANC

Primary:

```text
K1 Murni
TM1 USG
TM3 USG
K6
12T
```

Supporting:

```text
Jumlah ibu hamil
Jumlah ibu bersalin
K1 akses
TM1 Dokter
TM3 Dokter
```

---

# 22. Grafik Capaian per Puskesmas

Reuse pattern dashboard Balita.

Title:

```text
Grafik Capaian per Puskesmas
```

Control:

```text
Pilih indikator
```

Chart:

```text
horizontal/vertical bar chart
```

Required:

- 39 Puskesmas;
- target reference line;
- label percentage;
- sort berdasarkan value;
- tooltip numerator/denominator;
- click bar → set filter Puskesmas;
- responsive scrolling untuk mobile.

---

# 23. Ranking Context

Karena dua indikator bersifat **lower is better**, ranking harus context aware.

For higher-is-better:

```text
Capaian Tertinggi
Capaian Terendah
```

For lower-is-better:

```text
Prevalensi Terendah
Prevalensi Tertinggi
```

Jangan menggunakan label "terbaik/terburuk".

Side panel dapat menampilkan:

```text
3 nilai terendah/tertinggi
nilai minimum
nilai maksimum
rata-rata deskriptif
median
```

Catatan:

`rata-rata` pada panel hanya statistik distribusi antar Puskesmas, bukan nilai indikator Kabupaten.

Nilai indikator Kabupaten tetap ratio-of-sums.

---

# 24. Kabupaten Metric vs Average of Puskesmas

Dashboard wajib membedakan:

```text
Capaian Kabupaten
```

dan:

```text
Rata-rata Puskesmas
```

Formula Kabupaten:

```text
SUM(numerator seluruh Puskesmas)
/ SUM(denominator seluruh Puskesmas)
* 100
```

Formula average:

```text
AVG(pct_puskesmas)
```

Keduanya boleh ditampilkan, tetapi jangan ditukar.

Primary official metric:

```text
Capaian Kabupaten
```

---

# 25. Detail Rekapitulasi

Table title:

```text
Detail Rekapitulasi Indikator Ibu Hamil
```

Default Ringkasan columns:

```text
Puskesmas
% Anemia
% Anemia Ringan TTD
% Anemia Sedang/Berat
% Mendapat Suplementasi
% Konsumsi Suplementasi
% KEK
% KEK Mendapat PMT
% K1 Murni
% TM1 USG
% TM3 USG
% K6
% 12T
Freshness
```

Features:

```text
pagination
search
sort
sticky first column
CSV export
Excel export
conditional target highlighting
drill-down row
```

---

# 26. Conditional Formatting Table

Program metric:

```text
TARGET_MET
→ normal/success state

TARGET_NOT_MET
→ attention state

NO_DATA
→ neutral/gray state
```

Tidak diperlukan scoring merah-kuning-hijau tambahan tanpa business rule resmi.

---

# 27. Trend Chart

Title:

```text
Tren Indikator Ibu Hamil (2026)
```

Bulanan:

```text
Jan Feb Mar Apr Mei Jun Jul Agu Sep Okt Nov Des
```

Triwulan:

```text
TW I
TW II
TW III
TW IV
```

User dapat memilih maksimal 4 indikator secara bersamaan agar grafik tidak terlalu padat.

Default Ringkasan:

```text
% Anemia
% Mendapat Suplementasi
% KEK
% K1 Murni
```

---

# 28. Trend Data Rule

Karena data bersifat cumulative snapshot:

```text
trend month X =
ratio dari exact snapshot bulan X
```

Jangan:

```text
cumulative SUM dari snapshot Jan..X
```

Untuk TW:

```text
trend TW =
latest snapshot per desa pada cutoff masing-masing TW
```

---

# 29. Kelengkapan Data Laporan

Tab ini harus diperluas dari desain Balita.

## 29.1 Bulanan

Scorecards:

```text
Total Desa/Kel
Desa Sudah Input Bulan Dipilih
Desa Belum Input
% Kelengkapan
```

Formula:

```text
reporting_completeness =
desa_input_exact_month
/ total_active_desa
* 100
```

---

# 30. Data Freshness untuk TW

Karena TW memakai carry-forward, kelengkapan saja tidak cukup.

Tambahkan:

```text
Up-to-date pada cutoff
Carry-forward 1 bulan
Carry-forward 2 bulan
Carry-forward ≥3 bulan
Belum pernah input
```

Contoh TW II:

```text
Latest Juni    → FRESH
Latest Mei     → CF_1
Latest April   → CF_2
Latest ≤Maret  → STALE
No record      → MISSING
```

Scorecard:

```text
Freshness Rate =
desa dengan record cutoff month
/ total desa aktif
* 100
```

---

# 31. DQA — Data Quality Assessment

Setiap upload menjalankan DQA sebelum data dipublikasikan.

## 31.1 Schema validation

Required:

```text
tahun
kab_kota
kecamatan
puskesmas
desa
bulan
28 raw metric fields
```

---

## 31.2 Numeric validation

Semua count:

```text
integer
>= 0
```

---

## 31.3 Duplicate validation

Composite key:

```text
tahun + bulan + puskesmas + desa
```

Jika multiple rows ditemukan:

```text
jika waktu_input tersedia:
ambil latest untuk analytic snapshot
tetapi flag duplicate/revision

jika waktu_input tidak tersedia:
block publish
```

---

## 31.4 Cross-field consistency

### Anemia

```text
anemia_total_uploaded
==
anemia_mild
+ anemia_moderate
+ anemia_severe
```

### Suplementasi received

```text
received_supplement_total_uploaded
==
received_mms_180
+ received_ttd_180
```

### Suplementasi consumed

```text
consumed_supplement_total_uploaded
==
consumed_mms_180
+ consumed_ttd_180
```

---

# 32. Logical Validation

Rules:

```text
anemia_total <= hb_checked
anemia_mild_ttd <= anemia_mild
anemia_modsev_advanced <= anemia_moderate + anemia_severe
kek_risk <= lila_imt_measured
kek_received_pmt <= kek_management_target
```

Untuk rule yang dilanggar:

```text
WARN
```

bukan langsung delete/correct.

---

# 33. Cumulative Regression Check

Untuk satu desa:

```text
current_month_value < previous_month_value
```

pada cumulative count biasanya mencurigakan.

Flag:

```text
CUMULATIVE_REGRESSION
```

Tetapi jangan block otomatis karena revisi denominator/data cleaning dapat menyebabkan penurunan valid.

---

# 34. Numerator > Denominator

Jika:

```text
numerator > denominator
```

maka percentage > 100%.

RCS:

1. tetap menghitung angka;
2. tidak clamp ke 100%;
3. tampilkan warning DQA;
4. tooltip:

```text
Numerator lebih besar dari denominator.
Periksa konsistensi source atau definisi sasaran.
```

---

# 35. Zero Denominator

Cases:

```text
denominator = 0
numerator = 0
→ N/A

denominator = 0
numerator > 0
→ N/A + DQA CRITICAL
```

---

# 36. Upload Workflow

```text
Upload Excel
↓
Detect headers
↓
Map columns
↓
Normalize month/year/wilayah
↓
Schema validation
↓
DQA
↓
Preview
↓
User confirm
↓
Upsert staging
↓
Promote to production
↓
Refresh materialized aggregates
```

---

# 37. Recommended Database Model

## 37.1 `bumil_entries`

```sql
id uuid primary key
tahun int not null
month_number int not null
month_name text not null

kab_kota_id uuid
kecamatan_id uuid
puskesmas_id uuid not null
desa_id uuid not null

hb_checked int default 0
anemia_mild int default 0
anemia_moderate int default 0
anemia_severe int default 0
anemia_total_uploaded int default 0

anemia_mild_ttd int default 0
anemia_modsev_advanced int default 0

target_pregnant int default 0

received_mms_180 int default 0
received_ttd_180 int default 0
received_supplement_total_uploaded int default 0

consumed_mms_180 int default 0
consumed_ttd_180 int default 0
consumed_supplement_total_uploaded int default 0

lila_imt_measured int default 0
kek_risk int default 0
kek_management_target int default 0
kek_received_pmt int default 0

pregnant_total int default 0
delivery_total int default 0
k1_access int default 0
k1_pure int default 0
anc_t1_doctor int default 0
anc_t1_usg int default 0
anc_t3_doctor int default 0
anc_t3_usg int default 0
k6_delivery int default 0
anc_12t_delivery int default 0

source_file_id uuid
waktu_input timestamptz
uploaded_at timestamptz
uploaded_by uuid
```

Unique/revision strategy:

```text
do not hard-delete revisions
```

Recommended:

```sql
source_revision int
is_current boolean
```

---

# 38. Formula Registry

Jangan hardcode formula tersebar pada React components.

Buat:

```ts
type IndicatorDefinition = {
  key: string;
  domain: "anemia" | "supplementation" | "kek" | "anc";
  label: string;
  type: "program" | "monitoring";
  numeratorKey?: string;
  denominatorKey?: string;
  target?: number;
  direction?: "higher" | "lower";
  unit: "%" | "count";
  formulaVersion: string;
};
```

Contoh:

```ts
{
  key: "pct_anemia",
  domain: "anemia",
  label: "% Ibu Hamil Anemia",
  type: "program",
  numeratorKey: "anemia_total",
  denominatorKey: "hb_checked",
  target: 25,
  direction: "lower",
  unit: "%",
  formulaVersion: "GUIDANCE_2026"
}
```

---

# 39. Formula Profile

Table/config:

```text
indicator_formula_profiles
```

Fields:

```text
profile_code
indicator_key
valid_from
valid_to
numerator_expression
denominator_expression
target
direction
source_reference
```

Profiles:

```text
GUIDANCE_2026
LEGACY_SIGIZI_EXPORT
```

Tujuan:

- reproducibility;
- audit;
- future guideline updates;
- explain differences.

---

# 40. API / Service Layer

Recommended endpoints/service functions.

## Summary

```text
GET /api/bumil/summary
```

params:

```text
year
mode=monthly|quarterly
month?
quarter?
puskesmas_id?
desa_id?
formula_profile?
```

---

## Puskesmas comparison

```text
GET /api/bumil/by-puskesmas
```

returns:

```json
{
  "indicator": "pct_anemia",
  "target": 25,
  "direction": "lower",
  "kabupaten_value": 4.34,
  "puskesmas": []
}
```

---

## Trend

```text
GET /api/bumil/trend
```

params:

```text
indicators[]
year
puskesmas_id?
desa_id?
```

---

## DQA

```text
GET /api/bumil/dqa
```

---

# 41. Standard API Response per Indicator

```json
{
  "key": "pct_anemia",
  "label": "% Ibu Hamil Anemia",
  "value": 4.67,
  "unit": "%",
  "numerator": 14,
  "denominator": 300,
  "target": 25,
  "direction": "lower",
  "status": "TARGET_MET",
  "gap_pp": 20.33,
  "previous_value": 5.12,
  "delta_pp": -0.45,
  "trend_status": "positive",
  "formula_profile": "GUIDANCE_2026"
}
```

---

# 42. Aggregation Service Pseudocode

```ts
function getSelectedRows(
  rows,
  mode,
  year,
  monthNumber?,
  quarterCutoff?
) {
  const y = rows.filter(r => r.tahun === year);

  if (mode === "monthly") {
    return y.filter(r => r.monthNumber === monthNumber);
  }

  const eligible = y.filter(
    r => r.monthNumber <= quarterCutoff
  );

  return selectLatestBy(
    eligible,
    ["puskesmasId", "desaId"],
    ["monthNumber", "waktuInput"]
  );
}
```

Then:

```ts
const aggregate = sumFields(selectedRows);

const indicators = calculateIndicators(
  aggregate,
  masterTargets,
  formulaProfile
);
```

---

# 43. Important Aggregation Order

Correct:

```text
1. select valid rows
2. select snapshot per desa
3. sum count
4. calculate derived count
5. calculate percentage
```

Incorrect:

```text
calculate percentage per desa
then average percentages
```

---

# 44. Drill-down Behavior

Click scorecard:

```text
set selected indicator
scroll/focus chart
```

Click Puskesmas bar:

```text
filter Puskesmas
show Desa-level chart/table
```

Click table row:

```text
open side sheet/drawer
```

Drawer content:

```text
Puskesmas
Desa contribution
numerator
denominator
percentage
latest source month
freshness status
DQA warnings
```

---

# 45. Tooltip Standard

Scorecard/chart tooltip example:

```text
% Ibu Hamil Anemia

Formula:
Jumlah Bumil Anemia / Bumil Periksa Hb × 100%

Numerator: 654
Denominator: 15,075
Capaian: 4.34%
Target: ≤25%

Periode:
Februari 2026
```

---

# 46. AI Insight Layer

AI tidak menghitung formula sendiri dari natural language.

AI harus menerima **structured metrics** dari formula engine.

Pipeline:

```text
Database
→ deterministic aggregation
→ formula engine
→ validated JSON
→ AI narrative
```

AI use cases:

```text
Ringkas kondisi Kabupaten
Identifikasi indikator belum memenuhi target
Cari Puskesmas dengan gap target terbesar
Jelaskan perubahan antar periode
Deteksi anomali data
Jelaskan numerator/denominator
Buat narasi evaluasi program
```

---

# 47. AI Guardrails

AI dilarang:

```text
mengubah numerator/denominator
mengarang target
menganggap korelasi sebagai kausalitas
menghapus DQA warning
menganggap missing = zero
```

AI harus menggunakan wording:

```text
"Data menunjukkan..."
"Perlu verifikasi..."
"Terlihat perubahan..."
```

Bukan:

```text
"Penyebabnya pasti..."
```

kecuali ada evidence tambahan.

---

# 48. AI Context Object

```json
{
  "period": {
    "year": 2026,
    "mode": "monthly",
    "month": 2
  },
  "location": {
    "level": "kabupaten",
    "name": "Kabupaten Malang"
  },
  "indicators": [],
  "dqa": {
    "completeness": 99.74,
    "warnings": []
  }
}
```

---

# 49. UX Copy — Information Banner

Tambahkan banner ringan:

> **Cara baca laporan:** Data indikator merupakan angka kumulatif sampai periode yang dipilih. Laporan bulanan menggunakan input pada bulan tersebut. Laporan triwulanan menggunakan snapshot terbaru yang tersedia untuk setiap desa sampai akhir triwulan.

Tooltip:

> Persentase Kabupaten dihitung dari total numerator dibagi total denominator, bukan rata-rata persentase Puskesmas.

---

# 50. UX Copy — Formula Version Warning

Khusus konsumsi suplementasi:

Admin tooltip:

> Guidance 2026 menggunakan sasaran proyeksi ibu hamil sebagai denominator. Export SIGIZI yang digunakan pada proses reverse-engineering sebelumnya menggunakan sasaran ibu bersalin. SIGMA RCS menggunakan profile `GUIDANCE_2026` sebagai default dan mempertahankan comparator legacy untuk audit.

---

# 51. Example Validation — DONOMULYO Februari

Source example:

```text
Periksa Hb = 300
Anemia ringan = 12
Anemia sedang = 2
Anemia berat = 0
```

Derived:

```text
Anemia total = 12 + 2 + 0 = 14
```

Capaian:

```text
14 / 300 × 100
= 4.67%
```

---

## Suplementasi diterima

```text
MMS = 185
TTD = 32
Total = 217
Sasaran bumil = 999

217 / 999 × 100
= 21.72%
```

---

## Konsumsi suplementasi — guidance 2026

```text
MMS konsumsi = 18
TTD konsumsi = 35
Total = 53

53 / 999 × 100
= 5.31%
```

Legacy SIGIZI export:

```text
53 / 901 × 100
= 5.88%
```

Ini menjadi unit test wajib untuk formula versioning.

---

## KEK

```text
LILA/IMT = 433
KEK = 58

58 / 433 × 100
= 13.39%
```

---

# 52. ANC Derived KPI Example — DONOMULYO Februari

```text
Sasaran Bumil = 999
Sasaran Bersalin = 901

K1 Murni = 289
TM1 USG = 201
TM3 USG = 85
K6 = 28
12T = 27
```

Derived:

```text
K1 Murni:
289 / 999 × 100 = 28.93%

TM1 USG:
201 / 999 × 100 = 20.12%

TM3 USG:
85 / 999 × 100 = 8.51%

K6:
28 / 901 × 100 = 3.11%

12T:
27 / 901 × 100 = 3.00%
```

---

# 53. Completeness Example

Formula:

```text
desa_input
/ total_master_desa
* 100
```

Contoh:

```text
390 / 391 × 100
= 99.74%
```

---

# 54. File Upload Mapping UI

Saat file di-upload tampilkan preview:

```text
Source Header
→
RCS Field
→
Status
```

Contoh:

```text
Jumlah ibu hamil periksa Hb sampai bulan ini
→ hb_checked
✓ mapped
```

User dapat mengubah mapping sebelum import.

---

# 55. Data Persistence Strategy

Gunakan:

```text
staging_bumil_entries
```

untuk preview/validation.

Setelah confirm:

```text
bumil_entries
```

Data source file:

```text
uploaded_files
```

Record audit:

```text
upload_batches
```

---

# 56. Upload Batch Metadata

```text
batch_id
file_name
file_hash
year
uploaded_by
uploaded_at
row_count
valid_rows
warning_rows
error_rows
formula_profile
```

---

# 57. Idempotency

Upload file yang sama tidak boleh membuat duplicate batch tanpa warning.

Use:

```text
SHA-256 file hash
```

Jika hash sudah ada:

```text
show warning:
"File dengan konten identik pernah diunggah."
```

---

# 58. Revision Handling

Jika Puskesmas/Desa/bulan sudah ada:

```text
insert new revision
mark prior row is_current=false
mark new row is_current=true
```

Jangan destructive overwrite.

---

# 59. Performance Requirements

Target:

```text
Dashboard initial load < 2.5 s
Filter interaction < 1 s after cached aggregate
Upload validation 3,000 rows < 10 s
```

Gunakan:

```text
database view/materialized view
server-side aggregation
indexed year/puskesmas/desa/month
```

Recommended indexes:

```sql
(tahun, month_number)
(tahun, puskesmas_id, month_number)
(tahun, puskesmas_id, desa_id, month_number)
```

---

# 60. Security and Access

Role proposal:

```text
ADMIN_DINKES
ANALYST_DINKES
PUSKESMAS_USER
VIEWER
```

### ADMIN_DINKES

```text
upload
publish
delete/revert batch
manage formula profile
view all
```

### ANALYST_DINKES

```text
upload
analyze
export
no destructive delete
```

### PUSKESMAS_USER

```text
view own Puskesmas
upload if permitted
```

### VIEWER

```text
read only
```

Supabase RLS harus diterapkan pada raw data dan upload batches.

---

# 61. Export

Support:

```text
Excel
CSV
PNG chart
PDF report optional
```

Export harus mencantumkan:

```text
periode
wilayah
formula profile
waktu generate
target tahun
```

---

# 62. Data Dictionary UI

Sediakan action:

```text
Lihat Kamus Indikator
```

Drawer/modal menampilkan:

```text
indikator
definisi
numerator
denominator
formula
target
source field
direction
formula version
```

---

# 63. Recommended Component Architecture

```text
IbuHamilDashboard
├── DashboardHeader
├── DataModeTabs
├── PeriodFilters
├── DomainTabs
├── FormulaDefinitionPanel
├── IndicatorScorecardGrid
│   └── IndicatorScorecard
├── SupportingMetricCards
├── DqaAlertBanner
├── PuskesmasComparisonChart
├── RankingSummary
├── RecapTable
├── TrendChart
└── DataFreshnessPanel
```

---

# 64. Recommended Domain Config

```ts
export const bumilDomains = [
  {
    key: "anemia",
    label: "Anemia",
    indicators: [
      "pct_anemia",
      "pct_anemia_mild_ttd",
      "pct_anemia_modsev_advanced"
    ]
  },
  {
    key: "supplementation",
    label: "Suplementasi Gizi",
    indicators: [
      "pct_received_supplement",
      "pct_consumed_supplement"
    ]
  },
  {
    key: "kek",
    label: "KEK & PMT",
    indicators: [
      "pct_kek",
      "pct_kek_pmt"
    ]
  },
  {
    key: "anc",
    label: "Pemeriksaan Kehamilan",
    indicators: [
      "pct_k1_pure",
      "pct_anc_t1_usg",
      "pct_anc_t3_usg",
      "pct_k6",
      "pct_anc_12t"
    ]
  }
];
```

---

# 65. Visual Consistency with Balita Gizi

Reuse:

```text
card radius
border
spacing
filter bar
accordion formula
scorecard pattern
legend chips
chart container
table style
trend chart
responsive behavior
```

Jangan membuat modul Ibu Hamil terlihat sebagai aplikasi berbeda.

Perbedaan visual cukup pada:

```text
pregnant_woman icon
domain-specific labels
indicator icons
```

---

# 66. Icon Proposal

```text
Anemia
bloodtype / hematology-like icon

Suplementasi
medication

KEK
monitor_weight / nutrition

ANC
medical_services

Kelengkapan
fact_check

Trend
timeline
```

---

# 67. Responsive Requirements

Desktop:

```text
full filter bar
4-column scorecards
full table
```

Tablet:

```text
2-column scorecards
horizontal table scroll
```

Mobile:

```text
1-column
filter drawer
chart scroll
sticky indicator selector
```

---

# 68. Empty State

Jika belum ada data:

```text
Belum ada data untuk periode dan wilayah yang dipilih.
Silakan ubah filter atau unggah data laporan.
```

Jika TW memiliki stale data:

```text
Sebagian desa menggunakan data bulan sebelumnya.
Lihat detail freshness.
```

---

# 69. DQA Alert Priority

```text
INFO
WARNING
CRITICAL
```

Examples:

### INFO

```text
carry-forward 1 bulan
```

### WARNING

```text
cumulative regression
numerator > denominator
cross-field mismatch
```

### CRITICAL

```text
denominator 0 sementara numerator >0
unknown Puskesmas/Desa
duplicate tanpa revision timestamp
```

---

# 70. Acceptance Criteria — Formula Engine

## AC-F01

Given:

```text
monthly February
```

Then:

```text
hanya rows Februari digunakan
```

No carry-forward.

---

## AC-F02

Given:

```text
TW II
```

Then:

```text
latest available row per desa dengan month <= June digunakan
```

---

## AC-F03

Persentase:

```text
SUM numerator / SUM denominator
```

Tidak boleh:

```text
AVG persentase desa
```

---

## AC-F04

Kabupaten:

```text
SUM numerator semua Puskesmas
/
SUM denominator semua Puskesmas
```

---

## AC-F05

Output percentage dibulatkan:

```text
2 decimal
```

---

## AC-F06

Anemia total:

```text
mild + moderate + severe
```

---

## AC-F07

Default formula profile:

```text
GUIDANCE_2026
```

---

# 71. Acceptance Criteria — UI

## AC-UI01

Dashboard mempunyai:

```text
Kelengkapan Data Laporan
Analisis Indikator Ibu Hamil
```

---

## AC-UI02

Analytics mempunyai:

```text
Ringkasan
Anemia
Suplementasi
KEK & PMT
ANC
```

---

## AC-UI03

Setiap scorecard program menampilkan:

```text
value
target
status
numerator
denominator
```

---

## AC-UI04

Chart per Puskesmas mempunyai target line.

---

## AC-UI05

Table Puskesmas dapat drill-down ke Desa.

---

## AC-UI06

Trend chart mengikuti filter global.

---

# 72. Acceptance Criteria — DQA

## AC-DQA01

Upload duplicate diketahui.

## AC-DQA02

Mismatch derived total diberi warning.

## AC-DQA03

TW menampilkan freshness.

## AC-DQA04

Missing denominator tidak ditampilkan sebagai valid 0%.

## AC-DQA05

Raw source tidak diubah diam-diam oleh DQA.

---

# 73. Testing Strategy

## Unit test

Test formula:

```text
safePercent
anemia_total
received_supplement_total
consumed_supplement_total
target status
gap logic
trend direction
```

## Aggregation test

```text
exact month selection
latest-per-village TW selection
revision timestamp priority
Kabupaten ratio-of-sums
```

## UI test

```text
filter sync
domain switching
table drill-down
empty state
DQA warnings
```

---

# 74. Regression Test terhadap Source SIGIZI

Buat fixture:

```text
fixtures/bumil/february-2026.json
fixtures/bumil/tw2-2026.json
```

Expected result:

```text
raw count aggregate = export SIGIZI
```

Khusus indikator yang definisinya berubah karena guidance 2026:

```text
compare legacy vs guidance
```

dan dokumentasikan selisih.

---

# 75. Implementation Phases untuk Antigravity

## Phase 1 — Data contract

Tasks:

```text
create types
create field mapper
create formula registry
create target config
create formula profile
```

---

## Phase 2 — Database

Tasks:

```text
migration bumil_entries
migration master_sasaran
migration upload_batches
indexes
RLS
```

---

## Phase 3 — Upload & DQA

Tasks:

```text
Excel parser
header mapping
preview
DQA
revision
publish
```

---

## Phase 4 — Aggregation engine

Tasks:

```text
monthly selector
quarter selector
latest-per-desa
group aggregation
derived count
percentage
target status
freshness
```

---

## Phase 5 — Dashboard

Tasks:

```text
header
tabs
filter
formula panel
scorecards
chart
table
trend
DQA panel
```

---

## Phase 6 — AI Insight

Tasks:

```text
structured context builder
insight endpoint
anomaly narrative
target gap summary
```

---

## Phase 7 — Regression QA

Tasks:

```text
February comparison
TW II comparison
formula profile comparator
performance test
```

---

# 76. Definition of Done

Modul dianggap selesai jika:

- [ ] Template Excel berhasil di-upload.
- [ ] Semua field termapping tanpa manual coding per file.
- [ ] Monthly aggregation mereplikasi source report.
- [ ] TW latest-snapshot aggregation mereplikasi source report.
- [ ] 12 KPI 2026 dihitung deterministik.
- [ ] Target dan arah indikator benar.
- [ ] Kabupaten memakai ratio-of-sums.
- [ ] Dashboard konsisten dengan visual Balita Gizi.
- [ ] Kelengkapan data tersedia.
- [ ] Freshness TW tersedia.
- [ ] DQA tersedia.
- [ ] Formula versioning tersedia.
- [ ] Table dan chart drill-down bekerja.
- [ ] Trend bekerja.
- [ ] Export bekerja.
- [ ] AI hanya menggunakan structured validated metrics.
- [ ] Unit test dan regression test lulus.

---

# 77. Final Indicator Registry

```yaml
indicators:

  pct_anemia:
    domain: anemia
    type: program
    target: 25
    direction: lower
    numerator: anemia_total
    denominator: hb_checked

  pct_anemia_mild_ttd:
    domain: anemia
    type: program
    target: 50
    direction: higher
    numerator: anemia_mild_ttd
    denominator: anemia_mild

  pct_anemia_modsev_advanced:
    domain: anemia
    type: program
    target: 50
    direction: higher
    numerator: anemia_modsev_advanced
    denominator: anemia_moderate + anemia_severe

  pct_received_supplement:
    domain: supplementation
    type: program
    target: 92
    direction: higher
    numerator: received_supplement_total
    denominator: target_pregnant

  pct_consumed_supplement:
    domain: supplementation
    type: program
    target: 52
    direction: higher
    numerator: consumed_supplement_total
    denominator: target_pregnant
    formula_profile: GUIDANCE_2026

  pct_kek:
    domain: kek
    type: program
    target: 13
    direction: lower
    numerator: kek_risk
    denominator: lila_imt_measured

  pct_kek_pmt:
    domain: kek
    type: program
    target: 85
    direction: higher
    numerator: kek_received_pmt
    denominator: kek_management_target

  pct_k1_pure:
    domain: anc
    type: program
    target: 89
    direction: higher
    numerator: k1_pure
    denominator: target_pregnant

  pct_anc_t1_usg:
    domain: anc
    type: program
    target: 85
    direction: higher
    numerator: anc_t1_usg
    denominator: target_pregnant

  pct_anc_t3_usg:
    domain: anc
    type: program
    target: 84
    direction: higher
    numerator: anc_t3_usg
    denominator: target_pregnant

  pct_k6:
    domain: anc
    type: program
    target: 82
    direction: higher
    numerator: k6_delivery
    denominator: target_delivery

  pct_anc_12t:
    domain: anc
    type: program
    target: 66
    direction: higher
    numerator: anc_12t_delivery
    denominator: target_delivery
```

---

# 78. Implementation Instruction untuk Agentic AI IDE / Antigravity

Gunakan PRD ini sebagai **source of truth**.

Urutan kerja agent:

```text
1. Audit codebase SIGMA RCS existing.
2. Identifikasi reusable components dari Balita Gizi.
3. Jangan rewrite shared design system jika tidak diperlukan.
4. Buat data contract dan formula registry lebih dulu.
5. Implement upload/staging/DQA.
6. Implement deterministic aggregation service.
7. Tambahkan unit test.
8. Implement UI dashboard.
9. Tambahkan integration test.
10. Implement AI insight paling akhir.
```

Agent **tidak boleh**:

```text
membuat formula berdasarkan asumsi visual;
menggunakan AVG untuk aggregate percentage;
menjumlah snapshot bulanan menjadi TW;
mengubah denominator guidance tanpa formula version;
menghilangkan warning data;
menulis business formula hanya di frontend.
```

---

# 79. Recommended First Development Ticket

**Title**

```text
feat(bumil): implement canonical data model and deterministic formula engine
```

Acceptance:

```text
- canonical types created
- 28 source variables mapped
- 12 KPI definitions registered
- monthly selector implemented
- TW latest-per-desa selector implemented
- ratio-of-sums implemented
- formula profiles implemented
- unit tests with Donomulyo sample pass
```

Setelah ticket ini lulus, baru lanjut ke UI dashboard.

---

# 80. Product Principle

> **Raw data disimpan apa adanya. Formula dihitung secara deterministik. Definisi indikator diberi versi. Persentase tidak di-upload sebagai sumber kebenaran. Dashboard selalu dapat menjelaskan dari mana sebuah angka berasal.**

Prinsip ini menjadi fondasi modul Ibu Hamil dan selanjutnya dapat direplikasi ke modul SIGMA RCS lainnya.
