-- Run this entire script in your Supabase SQL Editor

-- 1. Distribusi Demografi
DROP FUNCTION IF EXISTS get_eppgbm_distribusi_demografi(text, text, text);

CREATE OR REPLACE FUNCTION get_eppgbm_distribusi_demografi(
  p_periode text,
  p_puskesmas text,
  p_kelurahan text
) RETURNS TABLE (
  kelompok_usia text,
  laki_laki int,
  perempuan int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT jk, usia_saatukur::numeric AS age_months
    FROM data_eppgbm
    WHERE periode = p_periode
      AND (p_puskesmas = 'Semua' OR puskesmas = p_puskesmas)
      AND (p_kelurahan = 'Semua' OR kelurahan = p_kelurahan)
  ),
  categorized AS (
    SELECT jk, 
      CASE 
        WHEN age_months >= 0 AND age_months <= 5 THEN '0-5 bulan'
        WHEN age_months >= 6 AND age_months <= 11 THEN '6-11 bulan'
        WHEN age_months >= 12 AND age_months <= 23 THEN '12-23 bulan'
        WHEN age_months >= 24 AND age_months <= 35 THEN '24-35 bulan'
        WHEN age_months >= 36 AND age_months <= 47 THEN '36-47 bulan'
        WHEN age_months >= 48 AND age_months <= 59 THEN '48-59 bulan'
        ELSE '>59 bulan'
      END as age_group
    FROM filtered
    WHERE age_months IS NOT NULL
  )
  SELECT 
    age_group AS kelompok_usia,
    COUNT(CASE WHEN jk = 'L' THEN 1 END)::int AS laki_laki,
    COUNT(CASE WHEN jk = 'P' THEN 1 END)::int AS perempuan
  FROM categorized
  GROUP BY age_group;
END;
$$;

-- 2. Distribusi Status Gizi
DROP FUNCTION IF EXISTS get_eppgbm_distribusi_statusgizi(text, text, text, text);

CREATE OR REPLACE FUNCTION get_eppgbm_distribusi_statusgizi(
  p_periode text,
  p_puskesmas text,
  p_kelurahan text,
  p_level text
) RETURNS TABLE (
  wilayah text,
  indikator text,
  status_gizi text,
  total_wilayah bigint,
  total bigint,
  persentase numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH data_filtered AS (
    SELECT 
      CASE WHEN p_level = 'puskesmas' THEN puskesmas ELSE kelurahan END AS agg_wilayah,
      bbu, tbu, bbtb
    FROM data_eppgbm
    WHERE periode = p_periode
      AND (p_puskesmas = 'Semua' OR puskesmas = p_puskesmas)
      AND (p_kelurahan = 'Semua' OR kelurahan = p_kelurahan)
  ),
  wilayah_totals AS (
    SELECT agg_wilayah, COUNT(*) as w_total
    FROM data_filtered
    GROUP BY agg_wilayah
  ),
  bbu_agg AS (
    SELECT agg_wilayah, 'BBU' AS indikator, NULLIF(TRIM(bbu), '') AS status_gizi, COUNT(*) as total
    FROM data_filtered WHERE NULLIF(TRIM(bbu), '') IS NOT NULL GROUP BY agg_wilayah, NULLIF(TRIM(bbu), '')
  ),
  tbu_agg AS (
    SELECT agg_wilayah, 'TBU' AS indikator, NULLIF(TRIM(tbu), '') AS status_gizi, COUNT(*) as total
    FROM data_filtered WHERE NULLIF(TRIM(tbu), '') IS NOT NULL GROUP BY agg_wilayah, NULLIF(TRIM(tbu), '')
  ),
  bbtb_agg AS (
    SELECT agg_wilayah, 'BBTB' AS indikator, NULLIF(TRIM(bbtb), '') AS status_gizi, COUNT(*) as total
    FROM data_filtered WHERE NULLIF(TRIM(bbtb), '') IS NOT NULL GROUP BY agg_wilayah, NULLIF(TRIM(bbtb), '')
  ),
  combined AS (
    SELECT * FROM bbu_agg UNION ALL
    SELECT * FROM tbu_agg UNION ALL
    SELECT * FROM bbtb_agg
  )
  SELECT 
    c.agg_wilayah AS wilayah,
    c.indikator,
    c.status_gizi,
    wt.w_total AS total_wilayah,
    c.total,
    ROUND((c.total::numeric / wt.w_total) * 100, 2) AS persentase
  FROM combined c
  JOIN wilayah_totals wt ON c.agg_wilayah = wt.agg_wilayah;
END;
$$;

-- 3. Digit Preference
DROP FUNCTION IF EXISTS get_eppgbm_digit_preference(text, text, text);

CREATE OR REPLACE FUNCTION get_eppgbm_digit_preference(
  p_periode text,
  p_puskesmas text,
  p_kelurahan text
) RETURNS TABLE (
  digit int,
  count_bb bigint,
  pct_bb numeric,
  count_tb bigint,
  pct_tb numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_total_bb bigint;
  base_total_tb bigint;
BEGIN
  SELECT 
    COUNT(bb), COUNT(tinggi)
  INTO 
    base_total_bb, base_total_tb
  FROM data_eppgbm
  WHERE periode = p_periode
    AND (p_puskesmas = 'Semua' OR puskesmas = p_puskesmas)
    AND (p_kelurahan = 'Semua' OR kelurahan = p_kelurahan)
    AND bb IS NOT NULL AND tinggi IS NOT NULL;

  RETURN QUERY
  WITH digits AS (
    SELECT generate_series(0, 9) AS d
  ),
  bb_counts AS (
    SELECT 
      CAST(MOD(CAST(bb * 10 AS numeric), 10) AS int) AS d,
      COUNT(*) AS c
    FROM data_eppgbm
    WHERE periode = p_periode AND bb IS NOT NULL
      AND (p_puskesmas = 'Semua' OR puskesmas = p_puskesmas)
      AND (p_kelurahan = 'Semua' OR kelurahan = p_kelurahan)
    GROUP BY CAST(MOD(CAST(bb * 10 AS numeric), 10) AS int)
  ),
  tb_counts AS (
    SELECT 
      CAST(MOD(CAST(tinggi * 10 AS numeric), 10) AS int) AS d,
      COUNT(*) AS c
    FROM data_eppgbm
    WHERE periode = p_periode AND tinggi IS NOT NULL
      AND (p_puskesmas = 'Semua' OR puskesmas = p_puskesmas)
      AND (p_kelurahan = 'Semua' OR kelurahan = p_kelurahan)
    GROUP BY CAST(MOD(CAST(tinggi * 10 AS numeric), 10) AS int)
  )
  SELECT 
    digits.d AS digit,
    COALESCE(b.c, 0)::bigint AS count_bb,
    ROUND((COALESCE(b.c, 0)::numeric / NULLIF(base_total_bb, 0)) * 100, 2) AS pct_bb,
    COALESCE(t.c, 0)::bigint AS count_tb,
    ROUND((COALESCE(t.c, 0)::numeric / NULLIF(base_total_tb, 0)) * 100, 2) AS pct_tb
  FROM digits
  LEFT JOIN bb_counts b ON digits.d = b.d
  LEFT JOIN tb_counts t ON digits.d = t.d
  ORDER BY digits.d;
END;
$$;

-- 4. Distribusi Metrik BB & TB (NEW)
DROP FUNCTION IF EXISTS get_eppgbm_distribusi_metrik(text, text, text);

CREATE OR REPLACE FUNCTION get_eppgbm_distribusi_metrik(
  p_periode text,
  p_puskesmas text,
  p_kelurahan text
) RETURNS TABLE (
  tipe text,
  nilai_integer int,
  frekuensi int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT bb, tinggi, nik
    FROM data_eppgbm
    WHERE periode = p_periode
      AND (p_puskesmas = 'Semua' OR puskesmas = p_puskesmas)
      AND (p_kelurahan = 'Semua' OR kelurahan = p_kelurahan)
      AND bb IS NOT NULL
      AND tinggi IS NOT NULL
  )
  SELECT 
    'BB'::text AS tipe,
    FLOOR(bb)::int AS nilai_integer,
    COUNT(DISTINCT nik)::int AS frekuensi
  FROM filtered
  GROUP BY FLOOR(bb)
  
  UNION ALL
  
  SELECT 
    'TB'::text AS tipe,
    FLOOR(tinggi)::int AS nilai_integer,
    COUNT(DISTINCT nik)::int AS frekuensi
  FROM filtered
  GROUP BY FLOOR(tinggi);
END;
$$;
