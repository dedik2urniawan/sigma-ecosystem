# PRD — SIGMA RCS: Modul Analisis Indikator Remaja Putri

**Dokumen:** Product Requirements Document (PRD)  
**Produk:** SIGMA RCS / SIGMA Ecosystem  
**Modul:** Analisis Indikator Remaja Putri (Rematri)  
**Versi PRD:** 1.0  
**Baseline kebijakan:** Pelayanan Kesehatan Anak Usia Sekolah dan Remaja / Pencatatan Pelaporan 2026  
**Status:** Implementation-ready untuk Agentic AI IDE / Antigravity  
**Target stack SIGMA:** Next.js App Router + TypeScript + Tailwind CSS + Supabase/PostgreSQL  
**Tanggal penyusunan:** 19 September 2026  

---

# 1. Executive Summary

Modul **Analisis Indikator Remaja Putri** pada SIGMA RCS adalah dashboard analitik untuk:

- menerima source data primer hasil export/entry SIGIZI Kesga;
- memvalidasi struktur dan kualitas data;
- mengagregasikan data Desa/Kelurahan → Puskesmas → Kabupaten;
- menghitung indikator Tablet Tambah Darah (TTD), skrining anemia, prevalensi anemia, dan tatalaksana anemia;
- membedakan indikator program dan supporting metrics;
- mendukung pelaporan bulanan, triwulanan, dan **tahun ajaran**;
- menampilkan scorecard, grafik per Puskesmas, severity profile anemia, trend, rekap detail, kelengkapan laporan, freshness, dan DQA;
- menyediakan deterministic formula engine sebagai sumber kebenaran bagi UI dan AI Insight.

Prinsip utama:

> **Raw count adalah source of truth. Percentage dihitung ulang oleh Formula Engine.**

Berbeda dari modul Ibu Hamil, pelaporan Remaja Putri secara substansi mengikuti **tahun ajaran**, sehingga periode Juli–Juni harus menjadi bagian eksplisit dari model data dan tidak boleh terjadi carry-forward lintas batas tahun ajaran.

---

# 2. Source Documents

PRD disusun berdasarkan:

1. `Daftar Entry Indikator Remaja.xlsx`
2. `Laporan Bulan Februari Indikator Remaja Putri.xlsx`
3. `Laporan Tahunan TW II Indikator Remaja Putri.xlsx`
4. `Sosialisasi Catpor 2026 Rematri_9 Apr2026.pdf`
5. `Kebijakan Pelayanan Kesehatan Usekrem - Indikator Yankesga-Ed.pdf`
6. pola UX existing SIGMA RCS modul Balita Gizi sebagai referensi konsistensi dashboard.

---

# 3. Hierarki Source of Truth

Jika terdapat perbedaan antar sumber, gunakan prioritas berikut.

## 3.1 Definisi indikator dan target

Gunakan:

```text
Kebijakan Pelayanan Kesehatan Anak Usia Sekolah dan Remaja 2026
+
Sosialisasi Pencatatan dan Pelaporan Indikator 2026
```

## 3.2 Bentuk raw variable

Gunakan:

```text
Daftar Entry Indikator Remaja.xlsx
```

## 3.3 Model agregasi report

Gunakan hasil reverse-engineering:

```text
Laporan Bulan Februari
Laporan Tahunan TW II
```

## 3.4 User Interface

Gunakan design language existing SIGMA RCS.

---

# 4. Evidence Summary dari Data yang Dianalisis

## 4.1 Source entry

Dataset source berisi:

```text
2,460 records
39 Puskesmas
390 pasangan Puskesmas–Desa/Kelurahan
periode Januari–Agustus pada export yang tersedia
```

Jumlah record per bulan:

```text
Januari   390
Februari  390
Maret     390
April     390
Mei       389
Juni      390
Juli       78
Agustus    43
```

Jumlah Desa/Kelurahan master pada laporan:

```text
391
```

Sedangkan pasangan Desa/Puskesmas yang muncul pada source:

```text
390
```

Perbedaan terdapat pada Gondanglegi:

```text
Master desa       = 8
Desa pernah input = 7
```

---

# 5. Reverse Engineering Confidence

## 5.1 Laporan Bulan Februari

Diuji:

```text
23 count variables × 39 Puskesmas = 897 comparisons
```

Hasil:

```text
897 / 897 match
```

dengan model:

```text
exact-month SUM pada record Februari
```

Diuji pula:

```text
9 percentage variables × 39 Puskesmas = 351 comparisons
```

Hasil:

```text
351 / 351 match
```

dengan model:

```text
SUM(numerator) / SUM(denominator) × 100
```

---

## 5.2 Laporan Tahunan TW II

Diuji:

```text
23 count variables × 39 Puskesmas = 897 comparisons
```

Hasil:

```text
897 / 897 match
```

dengan agregasi **snapshot Juni**.

Diuji pula:

```text
9 percentage variables × 39 Puskesmas = 351 comparisons
```

Hasil:

```text
351 / 351 match
```

dengan:

```text
ratio-of-sums
```

### Important limitation

Pada source, Juni memiliki data lengkap untuk seluruh 390 pasangan Desa/Puskesmas.

Karena itu data yang tersedia membuktikan:

```text
TW II = cumulative snapshot Juni
```

tetapi **tidak cukup untuk membuktikan secara empiris** bagaimana SIGIZI memperlakukan Desa yang tidak mempunyai entry Juni.

Untuk RCS, PRD menetapkan fallback:

```text
latest available snapshot per desa
within the SAME academic year
up to quarter cutoff
```

sebagai deterministic design decision.

Rule ini harus dilabeli:

```text
RCS_AGGREGATION_POLICY
```

bukan diklaim sebagai behavior SIGIZI yang telah terbukti.

---

# 6. Critical Difference vs Modul Ibu Hamil: Tahun Ajaran

Guidance Remaja Putri menyatakan pelaporan berdasarkan **tahun ajaran**.

Contoh:

```text
Tahun ajaran 2025/2026:
Juli 2025 → Juni 2026
```

Implikasi:

```text
Jan–Jun 2026 = academic year 2025/2026
Jul–Des 2026 = academic year 2026/2027
```

RCS tidak boleh memperlakukan Januari–Desember sebagai satu cumulative sequence yang tidak terputus.

---

# 7. Canonical Period Model

Setiap row production harus mempunyai:

```text
calendar_year
month_number
month_name
academic_year_start
academic_year_end
academic_year_label
academic_month_index
```

Derivation:

```text
if month_number >= 7:
    academic_year_start = calendar_year
    academic_year_end   = calendar_year + 1
else:
    academic_year_start = calendar_year - 1
    academic_year_end   = calendar_year
```

Label:

```text
2025/2026
2026/2027
```

Academic month index:

```text
Jul = 1
Aug = 2
Sep = 3
Oct = 4
Nov = 5
Dec = 6
Jan = 7
Feb = 8
Mar = 9
Apr = 10
May = 11
Jun = 12
```

---

# 8. Period Modes di Dashboard

Dashboard mendukung:

```text
Bulanan
Triwulanan
Tahun Ajaran
```

## 8.1 Bulanan

Input:

```text
Tahun kalender
Bulan
```

Output memakai exact month.

---

## 8.2 Triwulanan

Calendar quarter:

```text
TW I   = Jan–Mar
TW II  = Apr–Jun
TW III = Jul–Sep
TW IV  = Oct–Dec
```

Tetapi academic-year scope:

```text
TW I 2026  → AY 2025/2026
TW II 2026 → AY 2025/2026

TW III 2026 → AY 2026/2027
TW IV 2026  → AY 2026/2027
```

**Never carry forward June into July–September.**

---

## 8.3 Tahun Ajaran

Recommended primary annual reporting mode.

Example:

```text
Tahun Ajaran 2025/2026
```

End-period snapshot:

```text
Juni 2026
```

Annual indicator:

```text
latest valid snapshot per desa
within Jul 2025–Jun 2026
```

---

# 9. Monthly Aggregation Rule

Formula:

```text
MONTHLY_COUNT =
SUM(value)
WHERE calendar_year = selected_year
AND month_number = selected_month
```

Group levels:

```text
Desa
Puskesmas
Kabupaten
```

No carry-forward untuk monthly view.

Jika Desa tidak input pada bulan tersebut:

```text
exclude from monthly numerator/denominator
+
mark reporting missing
```

---

# 10. Quarterly Aggregation Rule

Recommended RCS algorithm:

```text
1. determine quarter cutoff
2. determine academic year associated with quarter
3. filter rows to same academic year
4. filter rows <= cutoff month
5. per Puskesmas + Desa, select latest month
6. if revisions exist in same month, select latest waktu_input
7. aggregate selected rows
```

Pseudo SQL:

```sql
WITH eligible AS (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY academic_year_label, puskesmas_id, desa_id
      ORDER BY
        academic_month_index DESC,
        waktu_input DESC
    ) AS rn
  FROM rematri_entries
  WHERE academic_year_label = :academic_year
    AND calendar_date <= :quarter_cutoff
)
SELECT *
FROM eligible
WHERE rn = 1;
```

---

# 11. Academic-Year Boundary Protection

Forbidden:

```text
TW III 2026:
Desa tidak input Juli–September
→ menggunakan Juni 2026
```

Reason:

```text
Juni = AY 2025/2026
Jul–Sep = AY 2026/2027
```

Correct:

```text
no Jul–Sep record
→ MISSING for TW III
```

---

# 12. Percentage Aggregation Principle

Semua percentages official dihitung setelah count aggregation.

Correct:

```text
SUM(numerator)
/
SUM(denominator)
× 100
```

Incorrect:

```text
AVG(percent_desa)
AVG(percent_puskesmas)
SUM(percent)
```

---

# 13. Kabupaten Metric

Official Kabupaten metric:

```text
Kabupaten % =
SUM numerator seluruh Puskesmas
/
SUM denominator seluruh Puskesmas
× 100
```

Rata-rata Puskesmas boleh ditampilkan sebagai descriptive distribution metric, tetapi tidak boleh menggantikan official Kabupaten value.

---

# 14. Source Column Dictionary

Source Excel memiliki 41 kolom.

## Identification

| Source | Field |
|---|---|
| [1] | No |
| [2] | Provinsi |
| [3] | Kabupaten/Kota |
| [4] | Kecamatan |
| [5] | Puskesmas |
| [6] | Kelurahan/Desa |
| [7] | Bulan |

## Remaja Putri dan TTD

| Source | Field |
|---|---|
| [8] | Jumlah sasaran remaja putri |
| [9] | Rematri mendapat TTD sesuai standar |
| [10] | % mendapat TTD |
| [11] | Rematri mengonsumsi TTD sesuai standar |
| [12] | % mengonsumsi TTD |
| [13] | Mendapat TTD <26 tablet |
| [14] | Mendapat TTD ≥26 tablet |
| [15] | Mengonsumsi TTD <26 tablet |
| [16] | Mengonsumsi TTD ≥26 tablet |

## Skrining Anemia

| Source | Field |
|---|---|
| [17] | Sasaran kelas 7 |
| [18] | Kelas 7 skrining anemia |
| [19] | % skrining kelas 7 |
| [20] | Sasaran kelas 10 |
| [21] | Kelas 10 skrining anemia |
| [22] | % skrining kelas 10 |
| [23] | Sasaran kelas 7+10 |
| [24] | Kelas 7+10 skrining anemia |
| [25] | % skrining kelas 7+10 |

## Anemia Kelas 7

| Source | Field |
|---|---|
| [26] | Anemia ringan |
| [27] | Anemia sedang |
| [28] | Anemia berat |
| [29] | Total anemia kelas 7 |
| [30] | % anemia kelas 7 |

## Anemia Kelas 10

| Source | Field |
|---|---|
| [31] | Anemia ringan |
| [32] | Anemia sedang |
| [33] | Anemia berat |
| [34] | Total anemia kelas 10 |
| [35] | % anemia kelas 10 |

## Total Anemia & Tata Laksana

| Source | Field |
|---|---|
| [36] | Total anemia kelas 7+10 |
| [37] | % anemia kelas 7+10 |
| [38] | Rematri anemia mendapat tatalaksana |
| [39] | % tatalaksana |
| [40] | Waktu Input |
| [41] | Tindakan |

---

# 15. Canonical Field Names

Recommended technical fields:

```text
target_rematri

ttd_received_standard
ttd_consumed_standard
ttd_received_lt26
ttd_received_ge26
ttd_consumed_lt26
ttd_consumed_ge26

target_grade7
screened_grade7
target_grade10
screened_grade10

target_grade7_10_uploaded
screened_grade7_10_uploaded

anemia_grade7_mild
anemia_grade7_moderate
anemia_grade7_severe
anemia_grade7_total_uploaded

anemia_grade10_mild
anemia_grade10_moderate
anemia_grade10_severe
anemia_grade10_total_uploaded

anemia_total_uploaded
anemia_treated

waktu_input
```

Percentage columns source disimpan hanya bila diperlukan untuk audit.

Production percentage tetap dihitung ulang.

---

# 16. Important Finding — Source Percentage Columns TTD

Pada seluruh 2,460 source records:

```text
[10] % mendapat TTD = 0
[12] % konsumsi TTD = 0
```

meskipun laporan bulanan dan TW menghasilkan percentage yang valid.

Conclusion:

```text
DO NOT USE [10] OR [12] AS ANALYTIC INPUT
```

Formula engine wajib menghitung ulang:

```text
ttd_received_standard / target_rematri
ttd_consumed_standard / target_rematri
```

---

# 17. Derived Relationships Proven on All 2,460 Rows

Relationship berikut cocok **100% pada seluruh source rows**.

## 17.1 Received standard

```text
ttd_received_standard
=
ttd_received_ge26
```

## 17.2 Consumed standard

```text
ttd_consumed_standard
=
ttd_consumed_ge26
```

## 17.3 Combined screening target

```text
target_grade7_10
=
target_grade7 + target_grade10
```

## 17.4 Combined screened

```text
screened_grade7_10
=
screened_grade7 + screened_grade10
```

## 17.5 Anemia kelas 7 total

```text
anemia_grade7_total
=
mild + moderate + severe
```

## 17.6 Anemia kelas 10 total

```text
anemia_grade10_total
=
mild + moderate + severe
```

## 17.7 Combined anemia

```text
anemia_total
=
anemia_grade7_total
+ anemia_grade10_total
```

---

# 18. Important Caveat — <26 dan ≥26

Jangan mengasumsikan:

```text
<26 + ≥26 = target
```

sebagai hard invariant.

Source yang dianalisis menunjukkan sejumlah records dimana kedua count tersebut tidak membentuk partition eksklusif terhadap target.

Karena itu:

```text
ttd_received_standard
ttd_consumed_standard
```

harus tetap menjadi authoritative program counts.

Field:

```text
<26
≥26
```

dipakai sebagai auxiliary/source-detail metrics dan DQA context.

Jangan otomatis mengubah source.

---

# 19. Indicator Taxonomy

Dashboard dibagi menjadi domain:

```text
1. Ringkasan
2. Tablet Tambah Darah
3. Skrining Anemia
4. Anemia & Severity
5. Tatalaksana
6. Kelengkapan & DQA
```

Optional companion:

```text
7. Distribusi TTD Sekolah
```

jika source sekolah tersedia.

---

# 20. Program KPI 2026

Core program scorecards:

| KPI | Target 2026 | Direction |
|---|---:|---|
| % Remaja Putri Mengonsumsi TTD | ≥67% | Higher |
| % Remaja Putri Kelas 7 & 10 Diskrining Anemia | ≥77% | Higher |
| % Remaja Putri Anemia | ≤23% | Lower |
| % Remaja Putri Anemia Mendapat Tatalaksana | ≥40% | Higher |

Supporting operational indicator jika source institusi tersedia:

```text
% Sekolah mendistribusikan TTD
Target 2026 ≥67%
```

---

# 21. KPI R1 — Remaja Putri Mendapat TTD Sesuai Standar

**Classification:** Supporting Metric  
**Target:** none pada core target table yang digunakan PRD  
**Direction:** higher is better descriptively

Numerator:

```text
ttd_received_standard
```

Denominator:

```text
target_rematri
```

Formula:

```text
pct_ttd_received =
SAFE_PERCENT(
  ttd_received_standard,
  target_rematri
)
```

Scorecard:

```text
% Rematri Mendapat TTD
```

Supporting:

```text
Mendapat sesuai standar
Sasaran rematri
<26 tablet
≥26 tablet
```

---

# 22. KPI R2 — Remaja Putri Mengonsumsi TTD

**Classification:** Program Indicator  
**Target 2026:** ≥67%  
**Direction:** Higher is better

Definition:

```text
Remaja putri SMP/sederajat dan SMA/sederajat
yang mengonsumsi TTD 1 tablet setiap minggu,
total minimal 26 tablet dalam satu tahun.
```

Numerator:

```text
ttd_consumed_standard
```

Denominator:

```text
target_rematri
```

Formula:

```text
pct_ttd_consumed =
SAFE_PERCENT(
  ttd_consumed_standard,
  target_rematri
)
```

---

# 23. KPI R3 — Skrining Anemia Kelas 7

**Classification:** Supporting sub-indicator

Numerator:

```text
screened_grade7
```

Denominator:

```text
target_grade7
```

Formula:

```text
pct_screening_grade7 =
SAFE_PERCENT(
  screened_grade7,
  target_grade7
)
```

---

# 24. KPI R4 — Skrining Anemia Kelas 10

**Classification:** Supporting sub-indicator

Formula:

```text
pct_screening_grade10 =
SAFE_PERCENT(
  screened_grade10,
  target_grade10
)
```

---

# 25. KPI R5 — Skrining Anemia Kelas 7 & 10

**Classification:** Program Indicator  
**Target 2026:** ≥77%  
**Direction:** Higher is better

Numerator:

```text
screened_grade7_10
```

Denominator:

```text
target_grade7_10
```

Formula:

```text
pct_screening_anemia =
SAFE_PERCENT(
  screened_grade7 + screened_grade10,
  target_grade7 + target_grade10
)
```

Jangan average percentage kelas 7 dan kelas 10.

---

# 26. KPI R6 — Anemia Kelas 7

**Classification:** Supporting outcome

Numerator:

```text
anemia_grade7_total
```

Denominator:

```text
screened_grade7
```

Formula:

```text
pct_anemia_grade7 =
SAFE_PERCENT(
  anemia_grade7_total,
  screened_grade7
)
```

---

# 27. KPI R7 — Anemia Kelas 10

Formula:

```text
pct_anemia_grade10 =
SAFE_PERCENT(
  anemia_grade10_total,
  screened_grade10
)
```

---

# 28. KPI R8 — Remaja Putri Anemia

**Classification:** Program Indicator  
**Target 2026:** ≤23%  
**Direction:** Lower is better

Definition:

```text
Remaja putri kelas 7 dan kelas 10
dengan Hb <12 g/dL.
```

Numerator:

```text
anemia_total
```

Denominator:

```text
screened_grade7_10
```

Formula:

```text
pct_anemia =
SAFE_PERCENT(
  anemia_total,
  screened_grade7_10
)
```

---

# 29. Severity Definition

## Mild

```text
Hb 11.0–11.9 g/dL
```

## Moderate

```text
Hb 8.0–10.9 g/dL
```

## Severe

```text
Hb <8.0 g/dL
```

Dashboard harus mempertahankan terminology ini.

---

# 30. Severity Counts

Derived:

```text
anemia_mild_total =
anemia_grade7_mild
+ anemia_grade10_mild
```

```text
anemia_moderate_total =
anemia_grade7_moderate
+ anemia_grade10_moderate
```

```text
anemia_severe_total =
anemia_grade7_severe
+ anemia_grade10_severe
```

Validation:

```text
anemia_total
=
mild_total + moderate_total + severe_total
```

---

# 31. KPI R9 — Anemia Mendapat Tatalaksana

**Classification:** Program Indicator  
**Target 2026:** ≥40%  
**Direction:** Higher is better

Numerator:

```text
anemia_treated
```

Denominator:

```text
anemia_total
```

Formula:

```text
pct_anemia_treated =
SAFE_PERCENT(
  anemia_treated,
  anemia_total
)
```

---

# 32. Tatalaksana — Definition Panel Content

Untuk informasi indikator pada UI:

```text
Anemia ringan:
TTD 1 tablet/hari selama 2–4 minggu
+ edukasi gizi seimbang.

Anemia sedang:
TTD 2 tablet/hari selama 2–4 minggu
+ edukasi gizi seimbang.

Anemia berat:
rujuk ke fasilitas tingkat lanjutan
+ edukasi gizi seimbang.
```

Catatan:

Dashboard hanya menampilkan definisi program.

SIGMA RCS bukan clinical decision support dan tidak memberikan instruksi terapi individual.

---

# 33. Supporting Scorecards

Di luar 4 program KPI, tampilkan:

```text
Jumlah Sasaran Rematri
% Mendapat TTD
Sasaran Kelas 7
Sasaran Kelas 10
Jumlah Skrining Kelas 7
Jumlah Skrining Kelas 10
Total Rematri Diskrining
Anemia Ringan
Anemia Sedang
Anemia Berat
```

---

# 34. Core Overview Scorecard Grid

Desktop:

```text
4 cards
```

Cards:

```text
1. Konsumsi TTD
2. Skrining Anemia
3. Anemia
4. Tatalaksana Anemia
```

Second row:

```text
Sasaran Rematri
Mendapat TTD
Total Skrining
Total Anemia
```

---

# 35. Scorecard Specification

Program scorecard harus menampilkan:

```text
Indicator
Current value
Target
Status
Numerator
Denominator
Gap target
Delta vs previous period
Academic year
Source freshness
DQA state
```

Example:

```text
% Remaja Putri Anemia
18.94%

Target ≤23%
TARGET_MET

Anemia    4,910
Skrining 25,918

Gap: +4.06 pp favourable
```

---

# 36. Status Logic

States:

```text
TARGET_MET
TARGET_NOT_MET
NO_DATA
DATA_WARNING
```

Higher:

```text
value >= target → TARGET_MET
```

Lower:

```text
value <= target → TARGET_MET
```

---

# 37. Safe Percentage

Recommended TypeScript:

```ts
export function safePercent(
  numerator: number | null | undefined,
  denominator: number | null | undefined,
): number | null {
  const n = Number(numerator ?? 0);
  const d = Number(denominator ?? 0);

  if (d <= 0) return null;

  return Math.round((n / d) * 10000) / 100;
}
```

UI:

```text
null → N/A
```

Never silently convert missing denominator into valid `0%`.

---

# 38. February 2026 Kabupaten Validation Example

From report:

```text
Sasaran Rematri            106,012
Mendapat TTD standar        89,891
Mengonsumsi TTD standar     89,351

Sasaran kelas 7+10          31,876
Diskrining                  25,918

Anemia                       4,910
Tatalaksana                  4,680
```

Calculated:

```text
Mendapat TTD =
89,891 / 106,012 × 100
= 84.79%

Konsumsi TTD =
89,351 / 106,012 × 100
= 84.28%

Skrining =
25,918 / 31,876 × 100
= 81.31%

Anemia =
4,910 / 25,918 × 100
= 18.94%

Tatalaksana =
4,680 / 4,910 × 100
= 95.32%
```

Semua sesuai report.

---

# 39. TW II Kabupaten Validation Example

Snapshot Juni:

```text
Sasaran Rematri            106,012
Mendapat TTD               103,499
Mengonsumsi TTD            102,361

Sasaran kelas 7+10          39,378
Diskrining                  37,570

Anemia                       6,539
Tatalaksana                  6,271
```

Capaian:

```text
Mendapat TTD    97.63%
Konsumsi TTD    96.56%
Skrining        95.41%
Anemia          17.40%
Tatalaksana     95.90%
```

---

# 40. Data Completeness Tab

Follow UX pattern SIGMA RCS.

Cards:

```text
Total Desa/Kelurahan
Desa Sudah Input
Desa Belum Input
% Kelengkapan
```

Formula monthly:

```text
COUNT(DISTINCT desa with exact month entry)
/
COUNT(active master desa)
× 100
```

February Kabupaten:

```text
390 / 391 × 100
= 99.74%
```

---

# 41. Freshness for Quarterly / Academic Year

Recommended statuses:

```text
FRESH
CF_1
CF_2
STALE
MISSING
```

Example TW II:

```text
Juni    → FRESH
Mei     → CF_1
April   → CF_2
Jan–Mar → STALE
none    → MISSING
```

But carry-forward only if row belongs to same academic year.

---

# 42. July Boundary Visualization

Trend chart harus mempunyai visual separator:

```text
JUN | JUL
```

Label:

```text
Pergantian Tahun Ajaran
```

Jangan menggambar continuous cumulative interpretation seolah Juli adalah lanjutan Juni.

---

# 43. Recommended Trend Modes

## Calendar Trend

```text
Jan–Dec
```

Use for operational monitoring.

Add academic-year boundary marker.

## Academic Year Trend

```text
Jul Aug Sep Oct Nov Dec Jan Feb Mar Apr May Jun
```

Recommended default untuk TTD.

---

# 44. Tablet Tambah Darah Domain

Primary chart:

```text
Grouped bar:
% Mendapat TTD
% Mengonsumsi TTD
```

Target line:

```text
67% hanya untuk konsumsi
```

Optional secondary visualization:

```text
Received → Consumed funnel
```

Metrics:

```text
received_standard
consumed_standard
gap count
conversion %
```

Formula:

```text
consumption_given_received =
consumed_standard
/
received_standard
×100
```

Classification:

```text
Analytic supporting metric
NOT official program indicator
```

---

# 45. Screening Domain

Scorecards:

```text
Kelas 7 screening %
Kelas 10 screening %
Combined screening %
```

Primary official target line:

```text
77% combined
```

Chart:

```text
Puskesmas comparison
```

Secondary:

```text
class 7 vs class 10 coverage
```

---

# 46. Anemia Domain

Scorecards:

```text
Combined anemia %
Class 7 anemia %
Class 10 anemia %
Total cases
```

Target:

```text
≤23% combined
```

Visuals:

```text
Severity stacked bar
Puskesmas prevalence bar
Class 7 vs Class 10 comparison
```

---

# 47. Severity Composition

Use percentage of anemia cases:

```text
mild_share =
mild_total / anemia_total ×100
```

```text
moderate_share =
moderate_total / anemia_total ×100
```

```text
severe_share =
severe_total / anemia_total ×100
```

These are analytical composition metrics, not program targets.

---

# 48. Tatalaksana Domain

Primary:

```text
% Anemia Mendapat Tatalaksana
Target ≥40%
```

Supporting:

```text
Total anemia
Total treated
Untreated count
```

Derived:

```text
untreated =
MAX(anemia_total - anemia_treated, 0)
```

---

# 49. Puskesmas Comparison Chart

Title:

```text
Grafik Capaian per Puskesmas
```

Indicator selector:

```text
Konsumsi TTD
Skrining Anemia
Anemia
Tatalaksana
Mendapat TTD
Skrining Kelas 7
Skrining Kelas 10
Anemia Kelas 7
Anemia Kelas 10
```

Features:

```text
39 Puskesmas
sort
target reference line
value labels
tooltip numerator/denominator
click → drilldown desa
```

---

# 50. Ranking Labels Must Respect Direction

For higher-is-better:

```text
Capaian Tertinggi
Capaian Terendah
```

For anemia:

```text
Prevalensi Terendah
Prevalensi Tertinggi
```

Avoid:

```text
Puskesmas terbaik
Puskesmas terburuk
```

---

# 51. Detail Recap Table

Default columns:

```text
Puskesmas
Sasaran Rematri
% Mendapat TTD
% Konsumsi TTD
% Skrining Kelas 7
% Skrining Kelas 10
% Skrining Total
% Anemia Kelas 7
% Anemia Kelas 10
% Anemia Total
% Tatalaksana
Freshness
DQA
```

Features:

```text
pagination
sorting
search
sticky puskesmas
Excel export
CSV export
drill-down
```

---

# 52. Desa Drilldown

Upon Puskesmas click:

```text
Puskesmas selected
→ table Desa/Kelurahan
```

Fields:

```text
Desa
Sasaran
TTD received
TTD consumed
Grade 7 target/screen
Grade 10 target/screen
Anemia total
Treated
Source month
Input timestamp
DQA
```

---

# 53. Formula Definition Panel

Use same RCS UX pattern:

```text
Definisi Operasional & Formula Remaja Putri
```

Cards:

```text
1. Konsumsi TTD
2. Skrining Anemia
3. Remaja Putri Anemia
4. Tatalaksana Anemia
```

Each card:

```text
definition
numerator
denominator
formula
target
direction
school-year note
source/version
```

---

# 54. Information Banner

Copy:

> Data Remaja Putri mengikuti tahun ajaran. Nilai laporan merupakan data kumulatif sampai periode yang dipilih. Persentase Kabupaten dihitung dari total numerator dibagi total denominator, bukan rata-rata persentase Puskesmas.

Quarter view:

> Snapshot triwulan tidak boleh menggunakan data dari tahun ajaran sebelumnya ketika melewati batas Juni–Juli.

---

# 55. DQA Framework

DQA runs before publish.

Categories:

```text
Schema
Completeness
Consistency
Plausibility
Temporal
Outlier
Freshness
```

---

# 56. Schema Validation

Required identity:

```text
tahun_pelaporan
bulan
kab_kota
kecamatan
puskesmas
desa
```

Required core counts:

```text
target_rematri
ttd_received_standard
ttd_consumed_standard
target_grade7
screened_grade7
target_grade10
screened_grade10
anemia severity counts
anemia_treated
```

---

# 57. Derived Total DQA

Validation:

```text
target_grade7_10_uploaded
==
target_grade7 + target_grade10
```

```text
screened_grade7_10_uploaded
==
screened_grade7 + screened_grade10
```

```text
anemia_grade7_total_uploaded
==
grade7_mild + grade7_moderate + grade7_severe
```

```text
anemia_grade10_total_uploaded
==
grade10_mild + grade10_moderate + grade10_severe
```

```text
anemia_total_uploaded
==
grade7_total + grade10_total
```

---

# 58. TTD Source Consistency

Observed invariant:

```text
ttd_received_standard
==
ttd_received_ge26
```

```text
ttd_consumed_standard
==
ttd_consumed_ge26
```

If not equal:

```text
DQA_WARNING_TTD_STANDARD_MISMATCH
```

Do not auto-correct raw source.

---

# 59. Logical DQA

Rules:

```text
screened_grade7 <= target_grade7
screened_grade10 <= target_grade10
anemia_grade7_total <= screened_grade7
anemia_grade10_total <= screened_grade10
anemia_treated <= anemia_total
```

Violation:

```text
WARNING
```

not automatic deletion.

---

# 60. Numerator > Denominator

The current data contains examples of coverage >100%.

RCS behavior:

```text
calculate actual percentage
do not clamp to 100
display DQA warning
```

Tooltip:

> Numerator lebih besar daripada denominator. Periksa perubahan sasaran, duplikasi, revisi, atau ketidaksesuaian sumber.

---

# 61. Extreme Outlier DQA

Observed source example:

```text
KASEMBON
Desa PONDOK AGUNG
April

target_rematri = 160
ttd_received_standard = 5,555,160
```

This must trigger:

```text
CRITICAL_OUTLIER
```

Suggested rule:

```text
if target > 0
and numerator / target > 1.25
→ WARNING

if numerator / target > 5
→ CRITICAL
```

Threshold is RCS DQA policy, not official indicator rule.

---

# 62. Temporal DQA

Because fields are cumulative inside academic year:

```text
current < previous
```

may indicate:

```text
revision
data correction
school target update
entry error
```

Flag:

```text
CUMULATIVE_REGRESSION
```

Do not auto-fail.

---

# 63. Academic-Year Reset Validation

Expected:

```text
July may reset/decrease sharply
```

Therefore:

```text
June → July decrease
```

must not automatically be marked cumulative regression.

Algorithm:

```text
if academic_year changes:
    reset temporal baseline
```

---

# 64. Duplicate/Revisions

Composite business key:

```text
academic_year
calendar_year
month_number
puskesmas_id
desa_id
```

If multiple rows:

```text
select latest waktu_input for analytics
retain all revisions for audit
```

Recommended columns:

```text
revision_number
is_current
source_batch_id
```

---

# 65. Upload Workflow

```text
Upload Excel
↓
Header Detection
↓
Field Mapping
↓
Normalize Region
↓
Derive Calendar Year
↓
Derive Academic Year
↓
Schema Validation
↓
DQA
↓
Preview
↓
Confirm
↓
Staging
↓
Publish
↓
Refresh Aggregates
```

---

# 66. Template Excel Recommendation

Do not reproduce merged headers in production upload template.

Use one-row canonical headers.

Recommended:

```text
tahun_pelaporan
bulan
kab_kota
kecamatan
puskesmas
desa

target_rematri

ttd_received_standard
ttd_consumed_standard
ttd_received_lt26
ttd_received_ge26
ttd_consumed_lt26
ttd_consumed_ge26

target_grade7
screened_grade7
target_grade10
screened_grade10

anemia_grade7_mild
anemia_grade7_moderate
anemia_grade7_severe

anemia_grade10_mild
anemia_grade10_moderate
anemia_grade10_severe

anemia_treated
waktu_input
```

Derived totals and percentage need not be manually entered.

---

# 67. Fields That Should Be Derived by RCS

Do not require:

```text
% received
% consumed
target grade 7+10
screened grade 7+10
% screening
grade 7 anemia total
% grade 7 anemia
grade 10 anemia total
% grade 10 anemia
combined anemia total
% combined anemia
% treatment
```

These can be generated deterministically.

---

# 68. Recommended Database Table

```sql
rematri_entries
```

Example schema:

```sql
id uuid primary key

calendar_year int not null
month_number int not null
month_name text not null

academic_year_start int not null
academic_year_end int not null
academic_year_label text not null
academic_month_index int not null

kab_kota_id uuid
kecamatan_id uuid
puskesmas_id uuid not null
desa_id uuid not null

target_rematri int default 0

ttd_received_standard bigint default 0
ttd_consumed_standard bigint default 0
ttd_received_lt26 bigint default 0
ttd_received_ge26 bigint default 0
ttd_consumed_lt26 bigint default 0
ttd_consumed_ge26 bigint default 0

target_grade7 int default 0
screened_grade7 int default 0
target_grade10 int default 0
screened_grade10 int default 0

target_grade7_10_uploaded int default 0
screened_grade7_10_uploaded int default 0

anemia_grade7_mild int default 0
anemia_grade7_moderate int default 0
anemia_grade7_severe int default 0
anemia_grade7_total_uploaded int default 0

anemia_grade10_mild int default 0
anemia_grade10_moderate int default 0
anemia_grade10_severe int default 0
anemia_grade10_total_uploaded int default 0

anemia_total_uploaded int default 0
anemia_treated int default 0

waktu_input timestamptz
source_batch_id uuid
revision_number int
is_current boolean default true

created_at timestamptz
created_by uuid
```

---

# 69. Master Wilayah

```text
master_wilayah
```

Fields:

```text
kabupaten
kecamatan
puskesmas
desa
active_from
active_to
```

Used for:

```text
completeness
filter dependency
canonical naming
unknown-area validation
```

---

# 70. Optional Master School

Future/companion module:

```text
master_sekolah
```

Fields:

```text
school_id
npsn
school_name
school_level
puskesmas_id
desa_id
active
```

Required if implementing institution-level TTD distribution.

---

# 71. Optional Companion — Distribusi TTD Sekolah

Policy/reporting materials describe separate data:

```text
school
jumlah rematri
tanggal distribusi
jumlah TTD didistribusikan
```

Important:

```text
jumlah remaja putri sasaran sekolah
diinput pada bulan Juli
```

Core source Excel currently provided **does not contain school-level distribution records**.

Therefore:

```text
NOT part of core v1 formula engine
```

Recommended Phase 2 module:

```text
Rematri → Distribusi TTD Sekolah
```

---

# 72. Optional School Distribution KPI

If data exists:

```text
% Sekolah mendistribusikan TTD sesuai standar
```

Target 2026:

```text
≥67%
```

Need explicit denominator:

```text
jumlah sekolah sasaran
```

Implementation should wait until school-level source/template is available.

---

# 73. CKG School Context

Policy 2026 indicates anemia screening:

```text
Kelas 7 SMP
Kelas 10 SMA — remaja putri
```

Recommended operational calendar shown in policy:

```text
SMP: July–September
SMA: October–December
```

Use this only as **context annotation**.

Do not change formula or zero out other months.

---

# 74. Trend Interpretation and Seasonality

Because services follow school calendar and implementation schedule:

```text
month-to-month comparison
```

must be descriptive.

AI should not claim:

```text
"penurunan disebabkan ..."
```

without additional evidence.

---

# 75. AI Insight Layer

Pipeline:

```text
raw data
→ deterministic selector
→ aggregate count
→ DQA
→ formula engine
→ structured JSON
→ AI narrative
```

AI does not independently calculate official KPI from raw Excel text.

---

# 76. AI Insight Use Cases

Allowed:

```text
summarize Kabupaten
identify target gaps
identify high anemia prevalence areas
identify low screening coverage
identify untreated anemia volume
describe severity mix
surface DQA anomalies
compare month/TW/academic year
```

---

# 77. AI Guardrails

AI must not:

```text
invent denominator
invent target
average percentages for official Kabupaten result
carry June data across July school-year boundary
diagnose individuals
prescribe individual treatment
hide DQA issues
```

---

# 78. AI Context Object

```json
{
  "period": {
    "mode": "academic_year",
    "academic_year": "2025/2026"
  },
  "location": {
    "level": "kabupaten",
    "name": "Kabupaten Malang"
  },
  "program_kpis": [],
  "supporting_metrics": [],
  "dqa": {
    "completeness": 99.74,
    "warnings": 0,
    "critical": 0
  }
}
```

---

# 79. Formula Registry

Create centralized config.

```ts
type IndicatorDefinition = {
  key: string;
  domain: string;
  label: string;
  type: "program" | "supporting" | "analytic";
  target?: number;
  direction?: "higher" | "lower";
  numeratorExpression?: string;
  denominatorExpression?: string;
  unit: "%" | "count";
  formulaVersion: string;
};
```

---

# 80. Final Formula Registry

```yaml
indicators:

  pct_ttd_received:
    domain: ttd
    type: supporting
    direction: higher
    numerator: ttd_received_standard
    denominator: target_rematri

  pct_ttd_consumed:
    domain: ttd
    type: program
    target: 67
    direction: higher
    numerator: ttd_consumed_standard
    denominator: target_rematri

  pct_screening_grade7:
    domain: screening
    type: supporting
    direction: higher
    numerator: screened_grade7
    denominator: target_grade7

  pct_screening_grade10:
    domain: screening
    type: supporting
    direction: higher
    numerator: screened_grade10
    denominator: target_grade10

  pct_screening_anemia:
    domain: screening
    type: program
    target: 77
    direction: higher
    numerator: screened_grade7 + screened_grade10
    denominator: target_grade7 + target_grade10

  pct_anemia_grade7:
    domain: anemia
    type: supporting
    direction: lower
    numerator: anemia_grade7_total
    denominator: screened_grade7

  pct_anemia_grade10:
    domain: anemia
    type: supporting
    direction: lower
    numerator: anemia_grade10_total
    denominator: screened_grade10

  pct_anemia:
    domain: anemia
    type: program
    target: 23
    direction: lower
    numerator: anemia_total
    denominator: screened_grade7 + screened_grade10

  pct_anemia_treated:
    domain: treatment
    type: program
    target: 40
    direction: higher
    numerator: anemia_treated
    denominator: anemia_total
```

---

# 81. Formula Version

Use:

```text
REMATRI_2026_V1
```

Formula registry stored separately from frontend.

Future revisions:

```text
REMATRI_2027_V1
```

without rewriting historic values.

---

# 82. Dashboard Header

Icon suggestion:

```text
girl / female
```

Title:

```text
Remaja Putri
```

Subtitle:

> Monitoring konsumsi Tablet Tambah Darah, skrining anemia, prevalensi anemia, tatalaksana, kualitas data, dan kepatuhan pelaporan.

Metadata:

```text
Data terakhir diperbarui:
DD MMM YYYY HH:mm
```

---

# 83. Primary Dashboard Tabs

```text
Kelengkapan Data Laporan
Analisis Indikator Remaja Putri
```

Analytics subtabs:

```text
Ringkasan
Tablet Tambah Darah
Skrining Anemia
Anemia & Severity
Tatalaksana
```

---

# 84. Global Filters

```text
Mode Periode
Tahun Kalender
Tahun Ajaran
Bulan / TW
Puskesmas
Desa/Kelurahan
```

Behavior:

```text
mode=monthly
→ show year + month

mode=quarterly
→ show year + TW + derived AY

mode=academic_year
→ show academic year
```

---

# 85. Formula Panel Example

For anemia:

```text
Persentase Remaja Putri Anemia

Jumlah Rematri Kelas 7 & 10
Teridentifikasi Anemia
-------------------------------- ×100
Jumlah Rematri Kelas 7 & 10
yang Diperiksa Hb

Target 2026: ≤23%
```

---

# 86. Chart Target Line

Only show target for official KPI.

Examples:

```text
TTD Consumption → 67%
Screening       → 77%
Anemia          → 23%
Treatment       → 40%
```

For received TTD:

```text
no official target line
```

unless configured by local policy.

---

# 87. Average vs Official Kabupaten

Side stat may show:

```text
Median Puskesmas
Mean Puskesmas
Minimum
Maximum
```

but official card remains:

```text
ratio-of-sums Kabupaten
```

---

# 88. Data Freshness Panel

For quarter / academic year:

```text
Fresh at cutoff
1 month lag
2 month lag
Older
Missing
```

Academic boundary enforced.

---

# 89. Outlier Panel

Display:

```text
Critical anomalies
Coverage >100%
Extreme jumps
Cumulative decreases
Derived-total mismatch
Missing area
Duplicate revisions
```

Click:

```text
open affected rows
```

---

# 90. Upload Mapping UI

Example:

```text
"Jumlah sasaran remaja putri"
→ target_rematri
✓

"Jumlah ... mengonsumsi TTD sesuai standar"
→ ttd_consumed_standard
✓
```

System recognizes legacy headers.

---

# 91. Legacy Header Dictionary

Maintain alias mapping so export SIGIZI can upload directly.

Example:

```ts
ALIASES = {
  "Jumlah sasaran remaja putri": "target_rematri",

  "Jumlah remaja putri di satuan pendidikan ... mendapat TTD sesuai standar":
    "ttd_received_standard",

  "Jumlah remaja putri di satuan pendidikan ... mengonsumsi TTD sesuai standar":
    "ttd_consumed_standard"
}
```

Use normalized text matching:

```text
trim
lowercase
collapse whitespace
normalize ≥ / >=
```

---

# 92. API — Summary

```text
GET /api/rematri/summary
```

Params:

```text
mode
calendar_year
month
quarter
academic_year
puskesmas_id
desa_id
```

---

# 93. API — By Puskesmas

```text
GET /api/rematri/by-puskesmas
```

Returns:

```json
{
  "indicator": "pct_anemia",
  "target": 23,
  "direction": "lower",
  "kabupaten_value": 18.94,
  "rows": []
}
```

---

# 94. API — Trend

```text
GET /api/rematri/trend
```

Must return:

```text
academic_year_boundary
```

metadata.

---

# 95. API — DQA

```text
GET /api/rematri/dqa
```

Response:

```text
schema
completeness
consistency
outlier
temporal
freshness
```

---

# 96. Recommended Component Architecture

```text
RematriDashboard
├── DashboardHeader
├── AnalysisModeTabs
├── PeriodFilterBar
├── DomainTabs
├── AcademicYearInfoBanner
├── FormulaDefinitionPanel
├── ProgramKpiGrid
├── SupportingMetricGrid
├── DqaAlertBanner
├── PuskesmasComparisonChart
├── SeverityChart
├── RankingSummary
├── RecapTable
├── TrendChart
└── DataFreshnessPanel
```

---

# 97. Severity Chart

Recommended:

```text
100% stacked bar
```

Dimensions:

```text
Puskesmas
```

Series:

```text
Mild
Moderate
Severe
```

Optional toggle:

```text
Count
Composition %
```

---

# 98. Funnel Analytic

Optional:

```text
Target Grade 7+10
↓
Screened
↓
Anemia
↓
Treated
```

Useful for program pathway.

Metrics:

```text
screening coverage
anemia prevalence
treatment coverage
```

Do not interpret funnel as individual cohort linkage because source is aggregate.

---

# 99. TTD Funnel

Optional:

```text
Target Rematri
↓
Received TTD standard
↓
Consumed TTD standard
```

Label:

```text
Aggregate program funnel
```

Not unique-person cohort.

---

# 100. RCS Design: No False Cohort Assumption

Because data is aggregate:

```text
do not infer that every consumed record
is a subset of specific received record at individual level
```

Use only aggregate ratio.

---

# 101. Performance

Target:

```text
Initial dashboard <2.5 sec
Filter change <1 sec cached
Upload 3,000 rows <10 sec validation
```

Indexes:

```sql
(academic_year_label, month_number)
(calendar_year, month_number)
(puskesmas_id, desa_id, academic_year_label)
(source_batch_id)
```

---

# 102. Security

Roles:

```text
ADMIN_DINKES
ANALYST_DINKES
PUSKESMAS_USER
VIEWER
```

Supabase RLS:

```text
Puskesmas user → own Puskesmas
Analyst/Admin   → Kabupaten
Viewer          → published aggregates
```

---

# 103. Auditability

Every dashboard metric must be traceable to:

```text
source batch
selected row IDs
aggregation policy
formula key
formula version
generated timestamp
```

---

# 104. Export

Support:

```text
Excel
CSV
PDF optional
PNG chart
```

Export metadata:

```text
period
academic year
location
formula version
target year
generated at
```

---

# 105. Acceptance Criteria — Formula

## AC-F01

Monthly February:

```text
exact February rows only
```

## AC-F02

TW II:

```text
end-quarter cumulative snapshot
```

Expected dataset regression:

```text
June aggregate = report TW II
```

## AC-F03

Percentage:

```text
ratio-of-sums
```

## AC-F04

Kabupaten:

```text
ratio-of-sums across Puskesmas
```

## AC-F05

No cross-year carry-forward:

```text
June 2026 cannot fill TW III 2026
```

## AC-F06

Academic year:

```text
Jul 2025–Jun 2026
```

## AC-F07

Anemia:

```text
mild + moderate + severe
```

## AC-F08

Treatment denominator:

```text
total anemia
```

---

# 106. Acceptance Criteria — Target

2026 config:

```text
pct_ttd_consumed = 67 higher
pct_screening_anemia = 77 higher
pct_anemia = 23 lower
pct_anemia_treated = 40 higher
```

---

# 107. Acceptance Criteria — DQA

## AC-DQA01

TTD source percentage columns not authoritative.

## AC-DQA02

Derived totals checked.

## AC-DQA03

Numerator > denominator warning.

## AC-DQA04

Extreme outlier warning.

## AC-DQA05

Temporal regression resets at academic-year change.

## AC-DQA06

Raw source retained unchanged.

---

# 108. Regression Fixtures

Create:

```text
fixtures/rematri/february.json
fixtures/rematri/tw2.json
```

Test:

```text
23 count metrics ×39 Puskesmas
```

and:

```text
9 percentages ×39 Puskesmas
```

---

# 109. Key Regression Test — February Kabupaten

Expected:

```yaml
target_rematri: 106012
ttd_received_standard: 89891
pct_ttd_received: 84.79

ttd_consumed_standard: 89351
pct_ttd_consumed: 84.28

target_grade7_10: 31876
screened_grade7_10: 25918
pct_screening_anemia: 81.31

anemia_total: 4910
pct_anemia: 18.94

anemia_treated: 4680
pct_anemia_treated: 95.32

reporting_completeness: 99.74
```

---

# 110. Key Regression Test — TW II

Expected:

```yaml
target_rematri: 106012
ttd_received_standard: 103499
pct_ttd_received: 97.63

ttd_consumed_standard: 102361
pct_ttd_consumed: 96.56

target_grade7_10: 39378
screened_grade7_10: 37570
pct_screening_anemia: 95.41

anemia_total: 6539
pct_anemia: 17.40

anemia_treated: 6271
pct_anemia_treated: 95.90
```

---

# 111. Unit Tests

Functions:

```text
safePercent
deriveAcademicYear
deriveAcademicMonth
selectMonthlyRows
selectQuarterSnapshot
selectAcademicYearSnapshot
aggregateCounts
deriveAnemiaTotals
calculateTargets
calculateStatus
calculateGap
```

---

# 112. Integration Tests

Test:

```text
Upload legacy SIGIZI Excel
↓
mapping
↓
staging
↓
DQA
↓
publish
↓
dashboard results
```

---

# 113. Implementation Phases — Antigravity

## Phase 1

```text
Canonical data contract
Academic-year utilities
Header alias map
Formula registry
Target registry
```

## Phase 2

```text
Database migrations
RLS
Upload batch
Revision architecture
```

## Phase 3

```text
Parser
Staging
DQA
Preview
Publish
```

## Phase 4

```text
Monthly aggregation
Quarter aggregation
Academic-year aggregation
```

## Phase 5

```text
Dashboard UI
Scorecards
Charts
Table
Trend
Freshness
```

## Phase 6

```text
AI Insight
```

## Phase 7

```text
Regression QA against Excel reports
```

---

# 114. Recommended First Development Ticket

Title:

```text
feat(rematri): implement academic-year data contract and deterministic formula engine
```

Deliverables:

```text
- canonical Rematri types
- academic-year derivation
- 23 raw count mapping
- derived field validators
- 9 analytic percentages
- 4 official program KPIs
- target registry 2026
- monthly selector
- TW selector
- ratio-of-sums
- regression fixtures
```

---

# 115. Definition of Done

- [ ] Legacy Excel dapat di-upload.
- [ ] Header mapping bekerja.
- [ ] Tahun kalender dan tahun ajaran tersimpan.
- [ ] Monthly report mereplikasi Februari.
- [ ] TW II mereplikasi June snapshot.
- [ ] Tidak ada carry-forward lintas Juni–Juli.
- [ ] Percentage memakai ratio-of-sums.
- [ ] 4 KPI program 2026 tersedia.
- [ ] Supporting TTD received tersedia.
- [ ] Class 7 / Class 10 sub-indicator tersedia.
- [ ] Severity anemia tersedia.
- [ ] Tatalaksana tersedia.
- [ ] Target/status benar.
- [ ] Completeness tersedia.
- [ ] Freshness tersedia.
- [ ] DQA tersedia.
- [ ] Outlier April terdeteksi.
- [ ] Drilldown Puskesmas → Desa tersedia.
- [ ] Trend mempunyai academic-year boundary.
- [ ] AI hanya memakai calculated structured metrics.
- [ ] Regression tests lulus.

---

# 116. Key Product Principle

> **Remaja Putri bukan sekadar dashboard kalender. Data harus dipahami sebagai program berbasis tahun ajaran.**

Dan:

> **SIGMA RCS menyimpan raw source apa adanya, menghitung indikator secara deterministik, memisahkan metric program dari supporting metric, menjaga batas tahun ajaran, dan mampu menjelaskan numerator–denominator dari setiap angka yang ditampilkan.**

---

# 117. Implementation Notes for Antigravity

Antigravity harus melakukan urutan:

```text
1. Audit reusable SIGMA components.
2. Implement period model first.
3. Implement canonical fields.
4. Implement formula registry.
5. Implement DQA.
6. Implement regression tests.
7. Implement backend aggregation.
8. Implement UI.
9. Implement AI Insight last.
```

Forbidden:

```text
- hardcode formula di React card
- average percentages untuk official Kabupaten
- menggunakan source [10]/[12] sebagai percentage
- menjumlah monthly cumulative snapshots
- carry-forward Juni ke Juli
- menganggap <26 dan ≥26 selalu partition target
- menghapus raw anomalies otomatis
```

---

# 118. Evidence Classification

Untuk menjaga auditability, implementation comments/config harus menggunakan label:

```text
SOURCE_CONFIRMED
GUIDANCE_CONFIRMED
RCS_DESIGN_DECISION
```

Examples:

```text
Monthly exact-month aggregation
→ SOURCE_CONFIRMED

Target consumption 67%
→ GUIDANCE_CONFIRMED

Latest available fallback saat quarter cutoff missing
→ RCS_DESIGN_DECISION
```

---

# 119. Suggested UI Order

Final recommended page flow:

```text
HEADER
↓
Kelengkapan | Analisis
↓
PERIOD FILTERS
↓
Academic-Year Information Banner
↓
Domain Tabs
↓
Definition & Formula
↓
4 Program KPI Cards
↓
Supporting Cards
↓
DQA Alert
↓
Puskesmas Comparison
↓
Severity / Funnel
↓
Detailed Recap
↓
Trend
↓
Freshness
```

---

# 120. Product Scope Summary

Core v1:

```text
Rematri aggregate reporting
TTD
Screening
Anemia
Treatment
DQA
Academic-year analytics
```

Phase 2:

```text
School distribution TTD
institution completeness
school-level drilldown
CKG integration
```

This separation prevents the current village-level Excel source from being forced to answer school-level questions it does not contain.
