-- Run this script in your Supabase SQL Editor

DROP FUNCTION IF EXISTS get_eppgbm_balita_bermasalah(text, text, text, text);

CREATE OR REPLACE FUNCTION get_eppgbm_balita_bermasalah(
  p_periode text,
  p_puskesmas text,
  p_kelurahan text,
  p_category text
) RETURNS TABLE (
  nik text,
  nama_balita text,
  jk text,
  tgl_lahir text,
  nama_ortu text,
  puskesmas text,
  alamat text,
  tgl_ukur text,
  bb text,
  tinggi text,
  zs_bbu text,
  bbu text,
  zs_tbu text,
  tbu text,
  zs_bbtb text,
  bbtb text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH raw_data AS (
    SELECT 
      d.nik,
      d.nama_balita,
      d.jk,
      d.tgl_lahir,
      d.nama_ortu,
      d.puskesmas,
      d.alamat,
      d.tgl_ukur,
      d.bb,
      d.tinggi,
      d.zs_bbu,
      d.bbu,
      d.zs_tbu,
      d.tbu,
      d.zs_bbtb,
      d.bbtb,
      -- TBU (Stunting)
      CASE WHEN CAST(NULLIF(d.zs_tbu, '') AS numeric) < -2 THEN true ELSE false END AS is_stunted,
      -- BBTB (Wasting)
      CASE WHEN CAST(NULLIF(d.zs_bbtb, '') AS numeric) < -2 THEN true ELSE false END AS is_wasted,
      -- BBU (Underweight)
      CASE WHEN CAST(NULLIF(d.zs_bbu, '') AS numeric) < -2 THEN true ELSE false END AS is_underweight
    FROM data_eppgbm d
    WHERE d.periode = p_periode
      AND (p_puskesmas = 'Semua' OR d.puskesmas = p_puskesmas)
      AND (p_kelurahan = 'Semua' OR d.kelurahan = p_kelurahan)
      AND NULLIF(d.zs_tbu, '') IS NOT NULL 
      AND NULLIF(d.zs_bbtb, '') IS NOT NULL 
      AND NULLIF(d.zs_bbu, '') IS NOT NULL
  ),
  classified AS (
    SELECT
      *,
      -- CIAF Category
      CASE
        WHEN NOT is_wasted AND NOT is_underweight AND NOT is_stunted THEN 'A'
        WHEN is_wasted AND NOT is_underweight AND NOT is_stunted THEN 'B'
        WHEN is_wasted AND is_underweight AND NOT is_stunted THEN 'C'
        WHEN is_wasted AND is_underweight AND is_stunted THEN 'D'
        WHEN NOT is_wasted AND is_underweight AND is_stunted THEN 'E'
        WHEN NOT is_wasted AND NOT is_underweight AND is_stunted THEN 'F'
        WHEN NOT is_wasted AND is_underweight AND NOT is_stunted THEN 'Y'
        ELSE 'A'
      END AS ciaf_cat
    FROM raw_data
  )
  SELECT 
    c.nik,
    c.nama_balita,
    c.jk,
    c.tgl_lahir,
    c.nama_ortu,
    c.puskesmas,
    c.alamat,
    c.tgl_ukur,
    c.bb,
    c.tinggi,
    c.zs_bbu,
    c.bbu,
    c.zs_tbu,
    c.tbu,
    c.zs_bbtb,
    c.bbtb
  FROM classified c
  WHERE c.ciaf_cat = p_category;
END;
$$;
