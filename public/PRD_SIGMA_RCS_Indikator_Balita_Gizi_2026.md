# PRD — SIGMA RCS: Modul Analisis Indikator Balita Gizi

**Dokumen:** Product Requirements Document + Formula/Aggregation Audit  
**Produk:** SIGMA RCS / SIGMA Ecosystem  
**Modul:** Balita Gizi  
**Versi PRD:** 1.0  
**Basis data audit:** Daftar Entry Balita Gizi + Laporan Bulan Februari + Laporan Tahunan TW II + Template Upload SIGMA RCS  
**Status:** Implementation-ready untuk Agentic AI IDE / Antigravity  
**Target stack:** Next.js App Router + TypeScript + Supabase/PostgreSQL  
**Tanggal:** 23 September 2026  

---

# 1. Tujuan Dokumen

Dokumen ini mempunyai dua fungsi sekaligus:

1. **PRD implementasi** untuk Modul Analisis Indikator Balita Gizi pada SIGMA RCS.
2. **Audit formula dan agregasi** terhadap sistem existing agar scorecard, grafik, tabel, dan laporan SIGMA RCS mereplikasi logika laporan SIGIZI secara benar tanpa ikut menyalin defect/mislabel pada source report.

Modul existing sudah mempunyai struktur:

```text
Kelengkapan Data Laporan
Analisis Indikator Balita Gizi
    ├── Analisis Pertumbuhan
    ├── Masalah Gizi
    ├── ASI Eksklusif dan MPASI
    ├── Suplementasi Zat Gizi Mikro
    └── Tatalaksana Balita Bermasalah Gizi
```

PRD ini **mempertahankan struktur UI tersebut**. Fokus pengembangan adalah kurasi formula engine, penyempurnaan DQA, penambahan metadata formula, serta penyelesaian menu **Tatalaksana Balita Bermasalah Gizi**.

---

# 2. Source of Truth

Dokumen menggunakan empat file utama:

```text
1. Daftar Entry Balita Gizi.xlsx
   → source primer / raw entry SIGIZI

2. Laporan Indikator Balita Gizi_Bulan Februari.xlsx
   → referensi algoritma laporan bulanan

3. Laporan Tahunan Triwulan II.xlsx
   → referensi algoritma laporan tahunan sampai TW II

4. template_data_balita_gizi(1).xlsx
   → template upload existing SIGMA RCS
```

Serta screenshot sistem existing sebagai referensi struktur UI.

---

# 3. Ringkasan Dataset Primer

Hasil pembacaan `Daftar Entry Balita Gizi`:

```text
Jumlah row data        : 3.050
Jumlah raw columns     : 110
Jumlah Puskesmas       : 39
Pasangan Puskesmas–Desa: 390
```

Distribusi row per bulan:

```text
Januari  : 390
Februari : 390
Maret    : 390
April    : 390
Mei      : 390
Juni     : 390
Juli     : 364
Agustus  : 346
```

Periode Januari–Juni mempunyai entry lengkap pada 390 pasangan Puskesmas–Desa.

Master laporan menunjukkan:

```text
Total Desa/Kelurahan = 391
```

sehingga source export mempunyai satu wilayah yang tidak muncul sebagai row entry.

---

# 4. High-Level Findings — Sangat Penting

## 4.1 Bulanan dan Tahunan/TW memakai algoritma berbeda

Laporan Februari dapat direplikasi dengan:

```text
EXACT MONTH
→ SUM Desa
→ Puskesmas
→ hitung percentage dari aggregated count
```

Sebaliknya, **Laporan Tahunan TW II bukan agregasi April–Juni saja**.

TW II pada Balita Gizi merupakan:

> **laporan year-to-date Januari sampai Juni**

dan tiap domain mempunyai aggregation operator yang berbeda.

---

## 4.2 Formula TW II bukan satu operator universal

| Domain | Agregasi Laporan Tahunan TW II |
|---|---|
| Pertumbuhan | Mean Jan–Jun pada level Desa → round → SUM Puskesmas |
| Masalah Gizi | Mean Jan–Jun pada level Desa → round → SUM Puskesmas |
| ASI Eksklusif | SUM Jan–Jun |
| MPASI | Mean hanya bulan pengukuran Maret & Juni pada level Desa → round → SUM |
| Vitamin A | Event-month logic Februari/Agustus + annual logic khusus |
| Tatalaksana Balita Bermasalah Gizi | SUM Jan–Jun |
| Stunting dirujuk | SUM Jan–Jun |

Ini adalah temuan terpenting untuk Formula Engine SIGMA RCS.

---

# 5. Definisi TW pada Balita Gizi

Untuk modul Balita Gizi gunakan interpretasi:

```text
TW I   = Year-to-date Januari–Maret
TW II  = Year-to-date Januari–Juni
TW III = Year-to-date Januari–September
TW IV  = Year-to-date Januari–Desember
```

Jangan:

```text
TW II = hanya April + Mei + Juni
```

Hal ini berbeda dengan konsep "quarter-only" yang umum.

Variable:

```ts
const quarterCutoff = {
  TW1: 3,
  TW2: 6,
  TW3: 9,
  TW4: 12
};
```

---

# 6. Validation Result — Laporan Februari

Audit terhadap 39 Puskesmas menunjukkan bahwa hampir seluruh count report Februari dapat direplikasi langsung dari source Februari.

### Direct count validation

```text
48 report count fields
× 39 Puskesmas
= 1.872 exact direct matches
```

Empat count tambahan merupakan **derived field** dan juga dapat direplikasi penuh:

```text
Vitamin A 6–59 denominator
Vitamin A 6–59 numerator
Gizi buruk 6–59 cases
Gizi buruk 6–59 treated
```

Sehingga:

```text
4 × 39 = 156 derived count matches
```

Percentage report juga berhasil direplikasi menggunakan numerator/denominator agregat.

---

# 7. Monthly Aggregation Engine

General rule:

```sql
SELECT
    puskesmas_id,
    SUM(raw_count)
FROM balita_entries
WHERE tahun = :year
  AND month_number = :selected_month
GROUP BY puskesmas_id;
```

Percentage:

```text
percentage =
SUM(numerator)
/
SUM(denominator)
× 100
```

Never:

```text
AVG(percentage_desa)
```

---

# 8. Kabupaten Aggregation

Official Kabupaten value harus selalu:

```text
Kabupaten Percentage =
SUM(all numerator)
/
SUM(all denominator)
×100
```

Bukan:

```text
AVG(% Puskesmas)
```

Jika dashboard ingin menampilkan average Puskesmas, label harus eksplisit:

```text
Rata-rata Puskesmas
```

dan tidak boleh menggantikan:

```text
Capaian Kabupaten
```

---

# 9. Formula Engine — Analisis Pertumbuhan

## 9.1 Source counts

Raw source utama:

```text
[9]  Balita 0–23 bulan
[10] Balita 24–59 bulan
[11] Balita 0–59 bulan

[12] 0–23 ditimbang
[14] 24–59 ditimbang
[16] 0–59 ditimbang

[18] 0–23 diukur PB/TB
[20] 24–59 diukur PB/TB
[22] 0–59 diukur PB/TB

[24] 0–23 ditimbang dan diukur
[26] 24–59 ditimbang dan diukur
[28] 0–59 ditimbang dan diukur

[30] Punya Buku KIA

[32] Naik BB (N)
[33] Tidak naik BB (T)
[34] Tidak ditimbang bulan lalu (O)
[35] Bayi baru lahir (B)
[36] D' / ditimbang terkoreksi
```

---

# 10. Derived Integrity Rules — Pertumbuhan

Terbukti pada seluruh **3.050 rows**:

```text
[11] = [9] + [10]
[16] = [12] + [14]
[22] = [18] + [20]
[28] = [24] + [26]
[36] = [32] + [33]
```

Implement sebagai DQA mandatory.

---

# 11. Monthly Pertumbuhan Formula

```text
% 0–23 ditimbang =
[12] / [9] ×100

% 24–59 ditimbang =
[14] / [10] ×100

% 0–59 ditimbang =
[16] / [11] ×100

% 0–23 diukur PB/TB =
[18] / [9] ×100

% 24–59 diukur PB/TB =
[20] / [10] ×100

% 0–59 diukur PB/TB =
[22] / [11] ×100

% 0–23 ditimbang dan diukur =
[24] / [9] ×100

% 24–59 ditimbang dan diukur =
[26] / [10] ×100

% 0–59 ditimbang dan diukur =
[28] / [11] ×100

% punya Buku KIA =
[30] / [11] ×100

% naik berat badan =
[32] / [36] ×100
```

---

# 12. TW Aggregation — Pertumbuhan

Ini bukan average pada level Puskesmas.

SIGIZI melakukan:

```text
FOR EACH DESA:
    avg = AVERAGE(Jan ... cutoff_month)
    rounded_avg = ROUND_HALF_EVEN(avg)

PUSKESMAS =
    SUM(rounded_avg seluruh Desa)
```

Pseudo-code:

```ts
function aggregateMeanVillageFirst(rows, cutoffMonth) {
  const groups = groupBy(rows, ["puskesmasId", "desaId"]);

  return groups.map(group => {
    const monthlyValues = group
      .filter(x => x.monthNumber <= cutoffMonth)
      .map(x => x.value);

    return roundHalfEven(mean(monthlyValues));
  })
  .reduce(sum);
}
```

---

# 13. Critical Rounding Rule — ROUND HALF EVEN

Reverse engineering menunjukkan rounding pada mean Desa mengikuti pola:

> **round-half-to-even / banker's rounding**

Contoh nyata pada DONOMULYO:

```text
Average Desa A = 372.5
→ menjadi 372

Average Desa B = 188.5
→ menjadi 188
```

Bukan:

```text
373
189
```

Jika RCS menggunakan standard SQL/PostgreSQL numeric ROUND yang berbeda, hasil Puskesmas dapat bergeser.

Pada field Balita 0–23 bulan saja, jika menggunakan:

```text
round(average Puskesmas)
```

alih-alih:

```text
SUM(roundHalfEven(average per Desa))
```

maka **19 dari 39 Puskesmas** dapat berbeda.

Maka urutan operasi harus dipertahankan.

---

# 14. Utility ROUND_HALF_EVEN

Implement centralized utility.

Contoh TypeScript menggunakan Decimal library:

```ts
function roundHalfEven(value: Decimal): number {
  return value
    .toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN)
    .toNumber();
}
```

Jangan bergantung pada implicit database rounding.

---

# 15. Critical Finding — PB/TB vs Ditimbang & Diukur pada Report TW II

Ditemukan indikasi kuat **mapping header/data tertukar pada Laporan Tahunan TW II SIGIZI**.

Report menampilkan:

```text
"diukur PB/TB"
```

tetapi count-nya berasal dari source:

```text
[24], [26], [28]
= ditimbang dan diukur
```

Sedangkan report menampilkan:

```text
"ditimbang dan diukur"
```

tetapi count-nya berasal dari:

```text
[18], [20], [22]
= diukur PB/TB
```

Monthly report Februari tidak mengalami swap ini.

---

# 16. Evidence of TW Mapping Swap

Observed TW II mapping:

```text
Report "PB/TB 0–23"        → source [24]
Report "PB/TB 24–59"       → source [26]
Report "PB/TB 0–59"        → source [28]

Report "Timbang+Ukur 0–23" → source [18]
Report "Timbang+Ukur 24–59"→ source [20]
Report "Timbang+Ukur 0–59" → source [22]
```

Semua 39 Puskesmas match setelah menggunakan mapping tersebut.

---

# 17. Decision for SIGMA RCS

**Jangan meniru swap tersebut di UI production.**

Gunakan semantic source mapping yang benar:

```text
PB/TB → [18],[20],[22]
Timbang & Ukur → [24],[26],[28]
```

Tambahkan regression mode:

```text
SIGIZI_PARITY_AUDIT
```

untuk membandingkan hasil dengan export report lama bila diperlukan.

Classification:

```text
SOURCE_REPORT_MAPPING_DEFECT
```

---

# 18. Formula Engine — Masalah Gizi

Raw counts:

```text
[38] Stunting
[40] Wasting
[42] Overweight
[44] Underweight
```

Monthly:

```text
% Stunting =
[38] / [22] ×100

% Wasting =
[40] / [28] ×100

% Overweight =
[42] / [28] ×100

% Underweight =
[44] / [16] ×100
```

---

# 19. TW Masalah Gizi

Numerator dan denominator menggunakan:

```text
mean per Desa Jan→cutoff
→ round-half-even
→ sum Puskesmas
```

Kemudian:

```text
% Stunting =
AVG_ROUNDED([38]) / AVG_ROUNDED([22]) ×100

% Wasting =
AVG_ROUNDED([40]) / AVG_ROUNDED([28]) ×100

% Overweight =
AVG_ROUNDED([42]) / AVG_ROUNDED([28]) ×100

% Underweight =
AVG_ROUNDED([44]) / AVG_ROUNDED([16]) ×100
```

Percentage dihitung setelah aggregated counts terbentuk.

---

# 20. Recommended Scorecards — Masalah Gizi

```text
Prevalensi Stunting
Prevalensi Wasting
Prevalensi Overweight
Prevalensi Underweight
```

Supporting values:

```text
Cases
Denominator
Period
Data completeness
Formula mode
```

Jangan memasang target jika target resmi/local configuration belum disediakan.

---

# 21. ASI Eksklusif — Source Pattern

Source menunjukkan:

```text
ASI Recall 0–5 bulan:
aktif Februari dan Agustus

ASI Eksklusif sampai 6 bulan:
tersedia setiap bulan
```

Raw:

```text
[46] Bayi 0–5
[47] Direcall
[48] ASI eksklusif recall 24 jam

[50] Bayi usia 6 bulan
[51] ASI eksklusif sampai 6 bulan
```

---

# 22. Monthly ASI Formula

Derived analytic KPI:

```text
% Bayi 0–5 Di-recall =
[47] / [46] ×100
```

Official report percentage:

```text
% ASI Eksklusif 0–5 =
[48] / [47] ×100
```

```text
% ASI Eksklusif 6 bulan =
[51] / [50] ×100
```

---

# 23. TW ASI Aggregation

ASI memakai **SUM year-to-date**:

```text
SUM Jan→cutoff
```

TW II:

```text
[46]_TW2 = SUM Jan–Jun
[47]_TW2 = SUM Jan–Jun
[48]_TW2 = SUM Jan–Jun
[50]_TW2 = SUM Jan–Jun
[51]_TW2 = SUM Jan–Jun
```

Kemudian percentage = ratio of sums.

Untuk recall 0–5, karena source hanya terisi Februari sampai TW II, SUM Jan–Jun secara praktis sama dengan February value.

---

# 24. Monthly Visibility — ASI

Recommended:

```text
Setiap bulan:
    ASI Eksklusif sampai usia 6 bulan

Februari & Agustus:
    Bayi 0–5
    Recall 0–5
    ASI Eksklusif Recall 24 jam
```

Jika user memilih bulan lain:

```text
jangan tampilkan 0% seolah indikator gagal
```

Gunakan:

```text
NOT_SCHEDULED
```

---

# 25. MPASI Source Pattern

MPASI raw data terisi pada:

```text
Maret
Juni
```

pada dataset saat ini.

Ini konsisten dengan cadence kuartalan:

```text
Maret
Juni
September
Desember
```

Raw:

```text
[53] Anak 6–23
[54] Anak 6–23 diwawancarai
[57] Konsumsi ≥5 dari 8 kelompok
[59] Konsumsi telur/ikan/daging
[61] MPASI baik
```

Source [56]:

```text
Kab/kota melakukan pemantauan praktik MPASI pada 80%...
```

bernilai 0 pada seluruh 3.050 rows.

Maka field [56] **tidak boleh menjadi source of truth**.

---

# 26. Derived MPASI Monitoring Coverage

RCS harus menghitung:

```text
% Anak 6–23 diwawancarai =
[54] / [53] ×100
```

dan:

```text
mpasi_monitoring_80_met =
pct_interviewed >= 80
```

Field ini derived, bukan input.

---

# 27. MPASI KPI Formula

```text
% MPASI ≥5/8 =
[57] / [54] ×100

% Telur/Ikan/Daging =
[59] / [54] ×100

% MPASI Baik =
[61] / [54] ×100
```

---

# 28. TW MPASI Aggregation

MPASI tidak di-average terhadap semua bulan kalender.

Gunakan **scheduled observation months**.

TW II:

```text
Maret + Juni
```

Per Desa:

```text
mean(Maret, Juni)
→ round-half-even
```

Puskesmas:

```text
SUM rounded mean setiap Desa
```

Verified 100% pada 39 Puskesmas untuk source:

```text
[53], [54], [57], [59], [61]
```

---

# 29. General MPASI TW Scheduled Months

Recommended:

```text
TW I  → Maret
TW II → Maret, Juni
TW III→ Maret, Juni, September
TW IV → Maret, Juni, September, Desember
```

Never include scheduled-off months as zeros in average.

---

# 30. Supplementation Vitamin A — Source Pattern

Vitamin A merupakan event-month indicator.

Dataset menunjukkan aktivitas utama:

```text
Februari
Agustus
```

Raw:

```text
[63] Bayi 6–11
[64] Bayi 6–11 mendapat Vit A

[66] Anak 12–59
[67] Anak 12–59 mendapat Vit A

[69] Anak 54–59
[70] Anak 54–59 mendapat Vit A

[72] Anak 12–59 mendapat Vit A 2 kali/setahun
```

---

# 31. Monthly Vitamin A

February report:

```text
% Vit A 6–11 =
[64] / [63] ×100

% cohort 54–59 =
[70] / [69] ×100
```

Derived 6–59 February:

```text
denominator =
[63] + [66]

numerator =
[64] + [67]

% =
([64]+[67])
/
([63]+[66])
×100
```

---

# 32. Important Template Finding — Vitamin A 6–59

Template existing mempunyai:

```text
Jumlah_anak_6-59_bulan_februari
Jumlah_anak_6-59_bulan_mendapat_Vitamin_A_februari
Jumlah_anak_6-59_bulan_Agustus
Jumlah_anak_6-59_bulan_mendapat_Vitamin_A_Agustus
```

Namun raw source columns ekuivalen pada export tidak mengandung data usable.

RCS harus menghitung field tersebut otomatis:

```text
Feb denominator = Feb [63] + Feb [66]
Feb numerator   = Feb [64] + Feb [67]

Aug denominator = Aug [63] + Aug [66]
Aug numerator   = Aug [64] + Aug [67]
```

Classification:

```text
DERIVED_NOT_UPLOAD_REQUIRED
```

---

# 33. TW II Vitamin A — Verified Formula

TW II report mempunyai dua section:

```text
Data Bulanan
Tahunan
```

Untuk TW II (cutoff Juni):

```text
February data digunakan
August data = 0 / belum tersedia
```

Verified annual section TW II:

```text
Annual 6–11 denominator = Feb [63]
Annual 6–11 numerator   = Feb [64]

Annual second cohort denominator = Feb [69]
Annual second cohort numerator   = Feb [70]

Annual 6–59 denominator =
Feb [63] + Feb [69]

Annual 6–59 numerator =
Feb [64] + Feb [70]
```

---

# 34. Vitamin A Post-August — Validation Gap

File yang tersedia hanya menyediakan report TW II.

Karena itu formula final annual Vitamin A setelah distribusi Agustus **belum dapat diverifikasi 1:1** terhadap report TW III/TW IV.

Source menyediakan:

```text
[72] Anak 12–59 mendapat Vitamin A 2 kali setahun
```

tetapi penggunaan exact denominator tahunan setelah Agustus memerlukan validasi report lanjutan.

Implement status:

```text
FORMULA_PROFILE = BALITA_2026_VITA_TW2_CONFIRMED
```

Untuk TW III/TW IV:

```text
REQUIRES_TWIII_OR_TWIV_REFERENCE_REPORT
```

Jangan mengarang formula diam-diam.

---

# 35. Tatalaksana Balita Bermasalah Gizi — Raw Fields

## Gizi kurang

```text
[81] Sasaran/case
[82] Mendapat PMT lokal
```

## Berat badan kurang

```text
[84] Sasaran/case
[85] Mendapat PMT lokal
```

## Berat badan tidak naik (T)

```text
[87] Sasaran
[88] Mendapat PMT lokal
```

## Gizi buruk 0–5

```text
[91] Cases
[92] Treated
```

## Gizi buruk 6–23

```text
[94] Cases
[95] Treated
```

## Gizi buruk 24–59

```text
[97] Cases
[98] Treated
```

## Stunting referral

```text
[103] Incident/source count
[104] Referred to RS
```

---

# 36. Monthly Tatalaksana Formula

```text
% Gizi kurang mendapat PMT =
[82]/[81]×100

% BB kurang mendapat PMT =
[85]/[84]×100

% T mendapat PMT =
[88]/[87]×100

% Gizi buruk 0–5 treated =
[92]/[91]×100

% Gizi buruk 6–23 treated =
[95]/[94]×100

% Gizi buruk 24–59 treated =
[98]/[97]×100
```

---

# 37. Derived Gizi Buruk 6–59

Raw source 6–59 total fields tidak reliable sebagai input.

Report membentuk:

```text
Gizi buruk 6–59 cases =
[94] + [97]

Treated 6–59 =
[95] + [98]
```

Formula:

```text
% treated 6–59 =
([95]+[98])
/
([94]+[97])
×100
```

Template columns:

```text
Jumlah_kasus_gizi_buruk_Balita_6-59...
Jumlah_Kasus_Gizi_Buruk_Balita_6-59_mendapat_perawatan...
```

harus diubah status menjadi:

```text
DERIVED
```

bukan mandatory upload.

---

# 38. Monthly Stunting Referral

```text
% Stunting dirujuk =
[104] / [103] ×100
```

Monthly SIGIZI memberi label:

```text
Jumlah insiden balita stunting
```

sedangkan raw source menyebut:

```text
Jumlah balita stunting sampai bulan ini
```

Ini adalah semantic mismatch source/report.

SIGMA RCS harus menyimpan nama raw dan menampilkan definition metadata secara eksplisit.

---

# 39. TW Tatalaksana Aggregation

Berbeda dari Pertumbuhan.

TW II memakai:

```text
SUM Januari–Juni
```

bukan average dan bukan June snapshot.

Verified untuk semua Puskesmas pada:

```text
[81],[82]
[84],[85]
[87],[88]
[91],[92]
[94],[95]
[97],[98]
[103],[104]
```

Derived gizi buruk 6–59 juga berasal dari SUM component counts.

---

# 40. General TW Tatalaksana

Recommended:

```text
TW I   = SUM Jan–Mar
TW II  = SUM Jan–Jun
TW III = SUM Jan–Sep
TW IV  = SUM Jan–Dec
```

Percentage selalu:

```text
SUM numerator / SUM denominator ×100
```

---

# 41. Rerata Balita Bermasalah Gizi Mendapat MT

Raw source mempunyai:

```text
[90] % Rerata balita bermasalah gizi mendapat makanan tambahan
```

tetapi:

```text
source [90] = 0 pada seluruh 3.050 rows
```

dan pada report TW II:

```text
semua 39 Puskesmas = "-"
```

Maka formula ini **belum terdefinisi secara empiris**.

Jangan implement:

```text
AVG(3 percentages)
```

atau:

```text
SUM numerator / SUM denominator
```

tanpa guidance.

Status:

```text
BLOCKED_PENDING_FORMULA_DEFINITION
```

---

# 42. Recommended Tatalaksana Tab

Primary scorecards:

```text
% Gizi Kurang Mendapat PMT Lokal
% BB Kurang Mendapat PMT Lokal
% Balita T Mendapat PMT Lokal
% Gizi Buruk 6–59 Mendapat Tatalaksana
% Stunting Dirujuk ke RS
```

Secondary breakdown:

```text
Gizi buruk 0–5
Gizi buruk 6–23
Gizi buruk 24–59
```

Do not show "Rerata" until definition confirmed.

---

# 43. Monthly Report Cross-Domain Leakage

Laporan Februari mempunyai tambahan:

```text
Ibu Hamil KEK mendapat makanan tambahan
```

setelah section Balita.

Ini bukan domain Balita Gizi.

SIGMA RCS Balita harus:

```text
EXCLUDE
```

dan indikator tersebut tetap berada pada modul Ibu Hamil.

---

# 44. Completeness Logic

Master:

```text
391 Desa/Kelurahan
```

Source unique:

```text
390
```

Monthly:

```text
desa_input =
COUNT(DISTINCT desa with exact month entry)

completeness =
desa_input / master_active_desa ×100
```

February:

```text
390 / 391 ×100
= 99.74%
```

---

# 45. Master Wilayah Is Mandatory

Do not infer `Total Desa/Kel` only from upload source.

Table:

```text
master_wilayah
```

Minimum:

```text
kab_kota_id
kecamatan_id
puskesmas_id
desa_id
desa_name
active_from
active_to
```

---

# 46. Master Sasaran Balita

Finding:

February source total:

```text
218,281
```

TW II report target:

```text
218,672
```

Difference:

```text
391
```

Seluruh perbedaan berada pada KARANGPLOSO.

Source:

```text
6,672
```

TW II report:

```text
7,063
```

Difference:

```text
391
```

Ini mengindikasikan annual report menggunakan target/master di luar entry source untuk satu wilayah yang tidak memiliki entry.

Maka `Jumlah Sasaran Balita` tahunan tidak boleh selalu bergantung pada source upload.

---

# 47. Recommended Master Target Table

```text
master_sasaran_balita
```

Fields:

```text
tahun
kab_kota_id
puskesmas_id
desa_id nullable
sasaran_balita
source
valid_from
valid_to
```

Priority:

```text
official master target
> raw entry target
```

dengan audit metadata.

---

# 48. Audit Existing Upload Template

Current template:

```text
66 columns
A:BN
```

Kelebihan:

```text
+ Tahun sudah ditambahkan
+ percentage source tidak ikut di-upload
+ struktur flat satu baris
+ cocok untuk parser
+ sebagian besar raw count penting tersedia
```

Namun ada beberapa field yang perlu diubah status menjadi derived.

---

# 49. Template-to-Source Mapping

| # | Template Field | Mapping |
|---:|---|---|
| 1 | `No` | source [1] No |
| 2 | `Tahun` | RCS-added: Tahun |
| 3 | `Puskesmas` | source [5] Puskesmas |
| 4 | `Kelurahan` | source [6] Kelurahan/Desa |
| 5 | `Bulan` | source [7] Bulan |
| 6 | `Jumlah_sasaran_balita` | [8] |
| 7 | `Jumlah_balita_usia_0-23_bulan_ini` | [9] |
| 8 | `Jumlah_balita_usia_24-59_bulan_ini` | [10] |
| 9 | `Jumlah_balita_usia_0-59_bulan_ini` | [11] |
| 10 | `Jumlah_balita_usia_0-23_bulan_ditimbang` | [12] |
| 11 | `Jumlah_balita_usia_24-59_bulan_ditimbang` | [14] |
| 12 | `Jumlah_balita_usia_0-59_bulan_ditimbang` | [16] |
| 13 | `Jumlah_balita_usia_0-23_bulan_diukur_PBTB` | [18] |
| 14 | `Jumlah_balita_usia_24-59_bulan_diukur_PBTB` | [20] |
| 15 | `Jumlah_balita_usia_0-59_bulan_diukur_PBTB` | [22] |
| 16 | `Jumlah_balita_usia_0-23_bulan_ditimbang_dan_diukur` | [24] |
| 17 | `Jumlah_balita_usia_24-59_bulan_ditimbang_dan_diukur` | [26] |
| 18 | `Jumlah_balita_usia_0-59_bulan_ditimbang_dan_diukur` | [28] |
| 19 | `Jumlah_balita_punya_KIA` | [30] |
| 20 | `Jumlah_balita_naik_berat_badannya_N` | [32] |
| 21 | `Jumlah_balita_tidak_naik_berat_badannya_T` | [33] |
| 22 | `Jumlah_balita_tidak_ditimbang_bulan_lalu_O` | [34] |
| 23 | `Jumlah_bayi_baru_lahir_bulan_ini_B` | [35] |
| 24 | `Jumlah_balita_ditimbang_terkoreksi_Daksen` | [36] |
| 25 | `Jumlah_balita_stunting` | [38] |
| 26 | `Jumlah_balita_wasting` | [40] |
| 27 | `Jumlah_balita_overweight` | [42] |
| 28 | `Jumlah_balita_underweight` | [44] |
| 29 | `Jumlah_Bayi_usia_0-5_bulan` | [46] |
| 30 | `Jumlah_Bayi_usia_0-5_bulan_yang_direcall` | [47] |
| 31 | `Jumlah_Bayi_usia_0-5_bulan_yang_mendapat_ASI_Eksklusif_berdasarkan_recall_24_jam` | [48] |
| 32 | `Jumlah_Bayi_usia_6_bulan` | [50] |
| 33 | `Jumlah_Bayi_Asi_Eksklusif_sampai_6_bulan` | [51] |
| 34 | `Jumlah_anak_usia_6-23_bulan` | [53] |
| 35 | `Jumlah_anak_usia_6-23_bulan_yang_diwawancarai` | [54] |
| 36 | `Kab_praktik_MPASI_pada_80pct_anak_usia_6-23_bulan` | [56] |
| 37 | `Jumlah_anak_usia_6-23_bulan_yang_mengkonsumsi_makanan_dan_minuman_setidaknya_5_dari_8_jenis_kelompok_makanan_pada_hari_kemarin_sebelum_wawancara` | [57] |
| 38 | `Jumlah_anak_usia_6-23_bulan_yang_mengkonsumsi_telur_ikan_dan_atau_daging_pada_hari_kemarin_sebelum_wawancara` | [59] |
| 39 | `Jumlah_anak_usia_6-23_bulan_yang_mendapat_MPASI_baik` | [61] |
| 40 | `Jumlah_bayi_6-11_bulan` | [63] |
| 41 | `Jumlah_bayi_6-11_bulan_mendapat_Vitamin_A` | [64] |
| 42 | `Jumlah_anak_12-59_bulan` | [66] |
| 43 | `Jumlah_anak_12-59_bulan_mendapat_Vitamin_A` | [67] |
| 44 | `Jumlah_anak_usia_54-59_bulan` | [69] |
| 45 | `Jumlah_anak_usia_54-59_bulan_mendapat_Vitamin_A` | [70] |
| 46 | `Jumlah_anak_12-59_bulan_mendapat_Vitamin_A_2_kali_dalam_setahun` | [72] |
| 47 | `Jumlah_anak_6-59_bulan_februari` | DERIVED: Feb 6–59 = [63]+[66] |
| 48 | `Jumlah_anak_6-59_bulan_mendapat_Vitamin_A_februari` | DERIVED: Feb VitA 6–59 = [64]+[67] |
| 49 | `Jumlah_anak_6-59_bulan_Agustus` | DERIVED: Aug 6–59 = [63]+[66] pada Agustus |
| 50 | `Jumlah_anak_6-59_bulan_mendapat_Vitamin_A_Agustus` | DERIVED: Aug VitA 6–59 = [64]+[67] pada Agustus |
| 51 | `Jumlah_Gikur_sampai_bulan_ini` | [81] |
| 52 | `Jumlah_Gikur_mendapatkan_PMTlokal` | [82] |
| 53 | `Jumlah_Bbkurang_sampai_bulan_ini` | [84] |
| 54 | `Jumlah_BBkurang_mendapatkan_PMTlokal` | [85] |
| 55 | `Jumlah_sasaran_balita_T` | [87] |
| 56 | `Jumlah_Balita_T659_mendapatkan_PMT` | [88] |
| 57 | `Jumlah_kasus_gizi_buruk_bayi_0-5_Bulan_sampai_bulan_ini` | [91] |
| 58 | `Jumlah_Kasus_Gizi_Buruk_bayi_0-5_Bulan_mendapat_perawatan_sampai_bulan_ini` | [92] |
| 59 | `Jumlah_kasus_gizi_buruk_Balita_6-23_Bulan` | [94] |
| 60 | `Jumlah_kasus_gizi_buruk_Balita_6-23_Bulan_mendapat_perawatan` | [95] |
| 61 | `Jumlah_kasus_gizi_buruk_Balita_24-59_Bulan` | [97] |
| 62 | `Jumlah_kasus_gizi_buruk_Balita_24-59_Bulan_mendapat_perawatan` | [98] |
| 63 | `Jumlah_kasus_gizi_buruk_Balita_6-59_Bulan_sampai_bulan_ini` | DERIVED: 6–59 cases = [94]+[97] |
| 64 | `Jumlah_Kasus_Gizi_Buruk_Balita_6-59_Bulan_mendapat_perawatan_sampai_bulan_ini` | DERIVED: 6–59 treated = [95]+[98] |
| 65 | `Jumlah_balita_stunting_sampai_bulan_ini` | [103] |
| 66 | `Jumlah_balita_stunting_dirujuk_Puskesmas_ke_RS_sampai_bulan_ini` | [104] |

---

# 50. Template Fields That Should Be Derived

## A. MPASI monitoring 80%

Current:

```text
Kab_praktik_MPASI_pada_80pct_anak_usia_6-23_bulan
```

Raw source [56] all zero.

Replace with:

```text
pct_mpasi_interviewed =
interviewed / target_6_23 ×100

mpasi_monitoring_80_met =
pct_mpasi_interviewed >=80
```

---

# 51. Derived Vitamin A 6–59 Template Fields

These should not be manually copied:

```text
Jumlah_anak_6-59_bulan_februari
Jumlah_anak_6-59_bulan_mendapat_Vitamin_A_februari
Jumlah_anak_6-59_bulan_Agustus
Jumlah_anak_6-59_bulan_mendapat_Vitamin_A_Agustus
```

System-generated from component age groups.

---

# 52. Derived Gizi Buruk 6–59 Template Fields

Do not trust raw total:

```text
Jumlah_kasus_gizi_buruk_Balita_6-59...
Jumlah_Kasus_Gizi_Buruk_Balita_6-59_mendapat_perawatan...
```

Compute:

```text
cases = 6–23 + 24–59
treated = treated6–23 + treated24–59
```

---

# 53. Missing Revision Metadata in Template

Current template tidak memuat:

```text
Waktu Input
```

Raw SIGIZI memiliki timestamp.

Recommendation:

Option A — keep template simple:

```text
batch_uploaded_at
batch_id
```

sebagai audit timestamp.

Option B — add optional:

```text
source_waktu_input
```

untuk memilih revision terbaru.

---

# 54. Formula Registry Architecture

Jangan hardcode formula pada React components.

Create:

```ts
type BalitaIndicatorDefinition = {
  key: string;
  domain:
    | "growth"
    | "nutrition_problem"
    | "asi_mpasi"
    | "micronutrient"
    | "treatment";

  aggregation:
    | "MONTH_EXACT_SUM"
    | "YTD_VILLAGE_MEAN_HALF_EVEN"
    | "YTD_SUM"
    | "SCHEDULED_MONTH_VILLAGE_MEAN_HALF_EVEN"
    | "EVENT_MONTH"
    | "DERIVED";

  numeratorExpression?: string;
  denominatorExpression?: string;
  scheduleMonths?: number[];
  unit: "%" | "count";
  sourceStatus:
    | "SOURCE_CONFIRMED"
    | "REPORT_CONFIRMED"
    | "RCS_DESIGN_DECISION"
    | "REQUIRES_VALIDATION";
};
```

---

# 55. Aggregation Modes

```ts
export const AGG = {
  MONTH_EXACT_SUM: "MONTH_EXACT_SUM",

  YTD_VILLAGE_MEAN_HALF_EVEN:
    "YTD_VILLAGE_MEAN_HALF_EVEN",

  YTD_SUM:
    "YTD_SUM",

  SCHEDULED_MONTH_VILLAGE_MEAN_HALF_EVEN:
    "SCHEDULED_MONTH_VILLAGE_MEAN_HALF_EVEN",

  EVENT_MONTH:
    "EVENT_MONTH",

  DERIVED:
    "DERIVED"
};
```

---

# 56. Domain Aggregation Registry

```yaml
growth:
  monthly: MONTH_EXACT_SUM
  quarterly: YTD_VILLAGE_MEAN_HALF_EVEN

nutrition_problem:
  monthly: MONTH_EXACT_SUM
  quarterly: YTD_VILLAGE_MEAN_HALF_EVEN

asi_recall_0_5:
  monthly: EVENT_MONTH
  schedule_months: [2, 8]
  quarterly: YTD_SUM

asi_6_month:
  monthly: MONTH_EXACT_SUM
  quarterly: YTD_SUM

mpasi:
  monthly: EVENT_MONTH
  schedule_months: [3, 6, 9, 12]
  quarterly: SCHEDULED_MONTH_VILLAGE_MEAN_HALF_EVEN

vitamin_a:
  monthly: EVENT_MONTH
  schedule_months: [2, 8]
  quarterly: SPECIAL_VITA

treatment:
  monthly: MONTH_EXACT_SUM
  quarterly: YTD_SUM
```

---

# 57. Safe Percentage Utility

```ts
export function safePercent(
  numerator: number | null,
  denominator: number | null
): number | null {
  if (denominator == null || denominator <= 0) return null;

  return Math.round(
    (numerator! / denominator) * 10000
  ) / 100;
}
```

Do not return valid `0%` when denominator is absent.

---

# 58. Zero Denominator UI

```text
0/0
→ N/A

numerator >0 and denominator=0
→ N/A + DQA CRITICAL
```

---

# 59. Do Not Clamp >100%

Observed source contains beberapa kasus numerator > denominator.

RCS:

```text
calculate actual %
do not clamp to 100
show DQA warning
```

---

# 60. Observed DQA Anomalies

Examples discovered in raw source include:

```text
weighed count > age population
PB/TB measured > age population
ASI exclusive > recall
Vit A numerator > denominator
PMT numerator > denominator
gizi buruk treated > cases
stunting referral > incident/source denominator
```

These must become warnings, not silent corrections.

---

# 61. DQA — Structural Invariants

Mandatory:

```text
0–59 = 0–23 + 24–59
weighed total = weighed0–23 + weighed24–59
PB/TB total = PB/TB0–23 + PB/TB24–59
both total = both0–23 + both24–59
D' = N + T
```

Violation:

```text
CRITICAL_DATA_INCONSISTENCY
```

---

# 62. DQA — Logical Rules

Warning rules:

```text
weighed <= age target
measured <= age target
both <= age target

stunting <= PB/TB measured
wasting <= both measured
overweight <= both measured
underweight <= weighed

ASI exclusive <= recall
ASI6 exclusive <= age6

interviewed <= child6–23
MPASI5/8 <= interviewed
egg/fish/meat <= interviewed
MPASI good <= interviewed

VitA received <= denominator

PMT received <= target
treated <= cases
referral <= denominator
```

---

# 63. DQA Severity

```text
INFO
WARNING
CRITICAL
```

Examples:

```text
INFO:
scheduled indicator not collected this month

WARNING:
numerator > denominator
temporal jump
coverage >100

CRITICAL:
missing Puskesmas mapping
duplicate without revision info
derived total inconsistent
```

---

# 64. Scheduled-Month Missing vs Zero

Very important.

For indicator that is not scheduled:

```text
February MPASI
```

should be:

```text
NOT_SCHEDULED
```

not:

```text
0%
```

Similarly:

```text
April ASI recall 0–5
```

should not be interpreted as zero performance.

---

# 65. Dashboard Header

Maintain current design.

Title:

```text
Balita Gizi
```

Subtitle:

> Monitoring pemantauan pertumbuhan, masalah gizi, praktik pemberian makan, suplementasi zat gizi mikro, tatalaksana balita bermasalah gizi, serta kualitas pelaporan.

---

# 66. Primary Tabs

```text
Kelengkapan Data Laporan
Analisis Indikator Balita Gizi
```

Do not change.

---

# 67. Analytics Domain Tabs

Maintain:

```text
Analisis Pertumbuhan
Masalah Gizi
ASI Eksklusif dan MPASI
Suplementasi Zat Gizi Mikro
Tatalaksana Balita Bermasalah Gizi
```

---

# 68. Global Filters

Existing:

```text
Pilih Periode Laporan
Bulan/TW
Tahun
Puskesmas
Desa/Kelurahan
```

Recommended modes:

```text
Bulanan
Triwulanan
```

For TW:

```text
TW I
TW II
TW III
TW IV
```

UI helper text:

> Laporan TW merupakan akumulasi/rekap tahun berjalan sampai akhir triwulan dan formula agregasinya berbeda menurut indikator.

---

# 69. Formula Metadata Banner

Tambahkan lightweight info banner:

> Setiap domain menggunakan formula agregasi sesuai karakter indikator. Pertumbuhan dan masalah gizi menggunakan rerata Desa year-to-date; ASI dan tatalaksana menggunakan penjumlahan; MPASI menggunakan rerata bulan pengukuran; Vitamin A mengikuti periode distribusi.

---

# 70. Analisis Pertumbuhan — Recommended Scorecards

Primary:

```text
% Balita 0–59 Ditimbang
% Balita 0–59 Diukur PB/TB
% Balita 0–59 Ditimbang & Diukur
% Balita Punya Buku KIA
% Balita Naik BB (N/D')
```

Secondary age breakdown:

```text
0–23
24–59
```

---

# 71. Pertumbuhan — Formula Definition Panel

For each indicator show:

```text
Definition
Numerator
Denominator
Monthly aggregation
TW aggregation
Source field
Formula version
```

Example:

```text
% Balita 0–59 Ditimbang

Bulanan:
SUM [16] / SUM [11]

TW:
SUM(roundHalfEven(avg Desa [16])))
/
SUM(roundHalfEven(avg Desa [11])))
```

---

# 72. Masalah Gizi — Layout

Scorecards:

```text
Stunting
Wasting
Overweight
Underweight
```

Chart:

```text
Capaian per Puskesmas
```

Trend:

```text
Jan–Dec
```

For TW trend:

```text
TW I–TW IV
```

---

# 73. ASI & MPASI — Scorecards

Recommended:

```text
% Bayi 0–5 Di-recall
% ASI Eksklusif 0–5
% ASI Eksklusif sampai 6 bulan
% Anak 6–23 Diwawancarai
% MPASI ≥5/8
% Telur/Ikan/Daging
% MPASI Baik
```

This aligns with the existing RCS analytical pattern.

---

# 74. ASI/MPASI — Visibility Rules

```text
February & August:
    Recall 0–5
    ASI Exclusive 0–5

Every month:
    ASI Exclusive 6 months

March, June, September, December:
    Interview 6–23
    MPASI 5/8
    Egg/Fish/Meat
    MPASI Good
```

---

# 75. Vitamin A — Recommended UI

Primary event cards:

```text
% Vitamin A 6–11
% Vitamin A 12–59
% Vitamin A 6–59
```

Context:

```text
Februari
Agustus
```

Annual section:

```text
Annual Vitamin A
```

but use formula profile with validation status.

---

# 76. Tatalaksana — UI Structure

Subsections:

```text
A. Makanan Tambahan
   - Gizi kurang
   - BB kurang
   - BB tidak naik (T)

B. Gizi Buruk
   - 0–5
   - 6–23
   - 24–59
   - 6–59

C. Referral
   - Stunting dirujuk Puskesmas → RS
```

---

# 77. Tatalaksana Comparison Chart

Indicator dropdown:

```text
Gizi Kurang → PMT
BB Kurang → PMT
Balita T → PMT
Gizi Buruk 6–59 → Tatalaksana
Stunting → Referral
```

Tooltip always show:

```text
Numerator
Denominator
Percentage
Aggregation mode
```

---

# 78. Detail Recap Table

Columns dynamic per domain.

General:

```text
Puskesmas
Numerator
Denominator
%
Completeness
DQA
Formula Mode
```

Drilldown:

```text
Puskesmas → Desa
```

---

# 79. Trend Engine

Monthly trend:

```text
exact-month formula
```

TW trend:

```text
recalculate TW I / TW II / TW III / TW IV independently
```

Do not create TW trend by:

```text
SUM monthly percentages
```

---

# 80. Data Freshness

For monthly:

```text
Exact month input status
```

For TW mean-domain:

```text
number of months included
expected months
missing months
```

Example:

```text
Expected Jan–Jun = 6
Village has only 5
→ PARTIAL_AVERAGE
```

---

# 81. Missing Month Policy — Mean Domain

For Growth/Problem TW:

Observed source Jan–Jun currently complete.

Recommended if missing in future:

```text
Do NOT substitute 0.
```

Compute:

```text
mean of available months
```

only if business approves.

Better default:

```text
flag PARTIAL_DATA
```

and show number of months.

Formula profile:

```text
REQUIRE_COMPLETE_PERIOD = true
```

recommended for official parity.

---

# 82. Missing Month Policy — SUM Domain

For ASI/Tatalaksana:

Missing scheduled data must not be silently interpreted as zero.

Use:

```text
missing
```

unless explicitly reported zero.

---

# 83. Database Model

Recommended:

```sql
balita_gizi_entries
```

Core:

```text
id
tahun
month_number
puskesmas_id
desa_id

all raw count fields

source_batch_id
source_waktu_input nullable
revision_number
is_current
created_at
```

---

# 84. Raw vs Derived

Database should separate:

```text
raw_*
derived_*
```

or define views.

Preferred:

```text
store raw counts
calculate derived in service/view
```

Do not store percentages as authoritative values.

---

# 85. Materialized Aggregates

Recommended views:

```text
mv_balita_monthly
mv_balita_tw_growth
mv_balita_tw_asi
mv_balita_tw_mpasi
mv_balita_tw_vita
mv_balita_tw_treatment
```

Avoid one generic SQL view with many conditional formulas.

---

# 86. API

```text
GET /api/balita/summary
GET /api/balita/by-puskesmas
GET /api/balita/trend
GET /api/balita/completeness
GET /api/balita/dqa
GET /api/balita/formula
```

---

# 87. API Request

Example:

```json
{
  "year": 2026,
  "mode": "quarterly",
  "quarter": 2,
  "domain": "growth",
  "puskesmas_id": null,
  "desa_id": null
}
```

---

# 88. Indicator Response

```json
{
  "key": "pct_stunting",
  "value": 6.12,
  "numerator": 1200,
  "denominator": 19608,
  "unit": "%",
  "aggregation": "YTD_VILLAGE_MEAN_HALF_EVEN",
  "formula_version": "BALITA_2026_V1",
  "data_status": "COMPLETE"
}
```

---

# 89. AI Insight Architecture

AI should never calculate official metrics from raw natural-language data.

Pipeline:

```text
Raw Excel
→ Normalization
→ DQA
→ Deterministic aggregation
→ Formula registry
→ JSON metrics
→ AI narrative
```

---

# 90. AI Guardrails

AI must not:

```text
average percentage Puskesmas for official Kabupaten metric
use quarter-only Apr–Jun for TW II
mix aggregation mode between domains
interpret NOT_SCHEDULED as 0
copy TW PB/TB report swap into production model
invent rerata PMT formula
invent Vitamin A post-Aug formula
```

---

# 91. Formula Versioning

Use:

```text
BALITA_2026_V1
```

Special:

```text
BALITA_2026_SIGIZI_PARITY
BALITA_2026_VITA_TW2_CONFIRMED
```

---

# 92. Audit Metadata

Every number should be explainable by:

```text
formula_key
formula_version
aggregation_mode
source_batch
source_rows
period
generated_at
```

---

# 93. Regression Test — February

Test all 39 Puskesmas.

Expected:

```text
Monthly counts = SUM exact February rows
Percentage = ratio-of-sums
```

No carry-forward.

---

# 94. Regression Test — TW II Growth

Expected:

```text
Jan–Jun
per Desa mean
round-half-even
sum to Puskesmas
ratio-of-sums
```

---

# 95. Regression Test — Mapping Swap

Create explicit test:

```text
SIGIZI report parity:
PB/TB report count uses source both-measure fields
```

But production semantic mode:

```text
PB/TB uses PB/TB source field
```

Test should prove both modes intentionally differ where source differs.

---

# 96. Regression Test — ASI

TW II:

```text
SUM Jan–Jun
```

Expected output must match SIGIZI.

---

# 97. Regression Test — MPASI

TW II:

```text
mean per Desa of March + June
round-half-even
sum
```

Do not average six calendar months.

---

# 98. Regression Test — Tatalaksana

TW II:

```text
SUM Jan–Jun
```

including:

```text
Gizi kurang
BB kurang
T
Gizi buruk
Stunting referral
```

---

# 99. Acceptance Criteria — Current Tabs

## Growth

- [ ] Monthly exact sum works.
- [ ] TW mean-village-first works.
- [ ] Half-even rounding implemented.
- [ ] PB/TB semantic mapping correct.

## Masalah Gizi

- [ ] denominator correct per indicator.
- [ ] TW mean logic correct.

## ASI/MPASI

- [ ] schedule visibility.
- [ ] ASI SUM TW.
- [ ] MPASI scheduled-month mean TW.

## Vitamin A

- [ ] February derived 6–59.
- [ ] August derived 6–59.
- [ ] TW II parity.
- [ ] post-Aug formula marked validation pending.

## Tatalaksana

- [ ] monthly formulas.
- [ ] YTD SUM TW.
- [ ] 6–59 derived.
- [ ] rerata hidden until defined.

---

# 100. Acceptance Criteria — Completeness

- [ ] Master 391 Desa.
- [ ] Exact monthly reporting count.
- [ ] Puskesmas drilldown.
- [ ] Missing vs zero distinguished.
- [ ] partial-period warning for TW.

---

# 101. Acceptance Criteria — Template

- [ ] Existing 66-column template remains importable.
- [ ] Derived fields can be blank.
- [ ] System calculates Vitamin A 6–59.
- [ ] System calculates Gizi Buruk 6–59.
- [ ] MPASI 80% field not treated as raw source of truth.
- [ ] Tahun is mandatory.
- [ ] Puskesmas and Desa canonicalized.

---

# 102. Recommended Template Policy

Keep current template for backward compatibility:

```text
VERSION = BALITA_TEMPLATE_V1
```

but change field metadata:

```text
RAW_REQUIRED
RAW_OPTIONAL
DERIVED
DEPRECATED
```

---

# 103. Suggested Field Metadata Examples

```yaml
Jumlah_balita_stunting:
  role: RAW_REQUIRED

Jumlah_anak_6-59_bulan_februari:
  role: DERIVED

Jumlah_kasus_gizi_buruk_Balita_6-59:
  role: DERIVED

Kab_praktik_MPASI_pada_80pct:
  role: DERIVED

source_waktu_input:
  role: RAW_OPTIONAL
```

---

# 104. Upload Workflow

```text
Upload Excel
↓
Schema validation
↓
Normalize names
↓
Map template fields
↓
Derive system fields
↓
DQA
↓
Preview
↓
Confirm
↓
Persist raw
↓
Refresh aggregates
```

---

# 105. Upload Preview

Show:

```text
Rows
Puskesmas
Desa
Months
Errors
Warnings
Derived fields generated
```

---

# 106. Naming Normalization

Normalize:

```text
uppercase/lowercase differences
double spaces
punctuation
Puskesmas aliases
Desa aliases
```

Never use fuzzy mapping without confirmation if ambiguous.

---

# 107. Duplicate Key

Business key:

```text
tahun
bulan
puskesmas
desa
```

If duplicate:

```text
if source timestamp exists:
    latest wins analytically
    retain revision

else:
    block publish / require decision
```

---

# 108. Performance Requirements

```text
Initial dashboard load < 2.5 s
Filter change cached < 1 s
Upload ~3,500 rows validation < 10 s
```

---

# 109. Indexes

```sql
(tahun, month_number)
(tahun, puskesmas_id, month_number)
(tahun, puskesmas_id, desa_id, month_number)
(source_batch_id)
```

---

# 110. Security

Roles:

```text
ADMIN_DINKES
ANALYST_DINKES
PUSKESMAS_USER
VIEWER
```

Puskesmas user:

```text
own Puskesmas only
```

---

# 111. Export

Support:

```text
Excel
CSV
PNG chart
PDF optional
```

Every export must include:

```text
period
formula version
aggregation mode
generated at
```

---

# 112. Known Issues Registry

## ISSUE-01
**TW report PB/TB mapping appears swapped.**

Status:

```text
CONFIRMED_BY_REVERSE_ENGINEERING
```

Action:

```text
correct semantic mapping in RCS
retain parity test
```

## ISSUE-02
**TW target balita differs from source at Karangploso by 391.**

Action:

```text
use master target
```

## ISSUE-03
**Source fields 6–59 Vitamin A not populated.**

Action:

```text
derive
```

## ISSUE-04
**Source gizi buruk 6–59 totals unreliable/empty.**

Action:

```text
derive from age components
```

## ISSUE-05
**Rerata PMT undefined.**

Action:

```text
do not display as official KPI
```

## ISSUE-06
**Vitamin A annual after August not verifiable from TW II file.**

Action:

```text
request TW III/TW IV report for final parity
```

---

# 113. Priority Curation Checklist

## P0 — Must Fix

```text
[ ] Verify TW mode is Jan→cutoff, not quarter-only
[ ] Implement village-first mean
[ ] Implement round-half-even
[ ] Correct PB/TB vs both mapping
[ ] Derive Vitamin A 6–59
[ ] Derive gizi buruk 6–59
[ ] Ensure ratio-of-sums
```

## P1 — High

```text
[ ] Implement scheduled visibility
[ ] Add DQA numerator>denominator
[ ] Join master wilayah 391 desa
[ ] Join master target balita
[ ] Complete Tatalaksana tab
```

## P2 — Enhancement

```text
[ ] Formula metadata tooltip
[ ] AI insight
[ ] revision timestamp
[ ] parity audit mode
```

---

# 114. Suggested Antigravity First Task

```text
feat(balita): centralize aggregation profiles and regression tests
```

Deliverables:

```text
1. Formula registry
2. Half-even utility
3. Monthly exact aggregation
4. YTD village mean aggregation
5. YTD sum aggregation
6. Scheduled-month mean aggregation
7. Regression fixtures February
8. Regression fixtures TW II
9. Mapping-defect compatibility test
```

---

# 115. Second Task

```text
refactor(balita): make template derived fields non-authoritative
```

Deliverables:

```text
Vitamin A 6–59 derived
Gizi buruk 6–59 derived
MPASI 80% derived
DQA added
```

---

# 116. Third Task

```text
feat(balita-treatment): complete Tatalaksana Balita Bermasalah Gizi
```

Deliverables:

```text
PMT cards
Gizi buruk cards
Referral card
Comparison chart
Puskesmas table
Trend
DQA
```

---

# 117. Definition of Done

Module dianggap curated jika:

- [ ] February report can be reproduced.
- [ ] TW II report can be reproduced under parity mode.
- [ ] Production mode uses correct semantic PB/TB mapping.
- [ ] Growth TW uses village mean + half-even.
- [ ] ASI TW uses SUM.
- [ ] MPASI TW uses scheduled-month village mean.
- [ ] Treatment TW uses SUM.
- [ ] Vitamin A February/August derived fields are correct.
- [ ] Kabupaten uses ratio-of-sums.
- [ ] Missing scheduled indicator is not displayed as zero.
- [ ] Master wilayah controls completeness.
- [ ] Master target controls official target.
- [ ] All derived fields are documented.
- [ ] DQA warnings are visible.
- [ ] Tatalaksana tab is completed.
- [ ] Formula version is attached to outputs.
- [ ] Regression tests pass.

---

# 118. Product Principle

> **Satu dashboard tidak berarti satu rumus agregasi.**

Balita Gizi mempunyai indikator dengan karakter berbeda:

```text
snapshot/monthly monitoring
mean prevalence
event-month reporting
year-to-date sum
scheduled-quarter observation
derived coverage
```

Formula Engine harus memahami domain masing-masing.

---

# 119. Final Engineering Rule

Always:

```text
SELECT RAW
→ APPLY PERIOD POLICY
→ APPLY DOMAIN AGGREGATION
→ DERIVE COUNTS
→ COMPUTE RATIO
→ RUN DQA
→ RENDER UI
```

Never:

```text
upload %
→ average %
→ display
```

---

# 120. Final Recommendation

Current architecture UI SIGMA RCS sudah dapat dipertahankan.

Kurasi utama bukan pada tampilan, tetapi pada **aggregation service**.

Urutan prioritas:

```text
1. Formula registry
2. Regression tests
3. Correct TW aggregation
4. Derived field cleanup
5. DQA
6. Complete Treatment tab
7. AI narrative
```

Dengan pola ini, setiap scorecard, chart, table, export, dan AI Insight akan memakai satu formula deterministic yang sama dan dapat diaudit.
