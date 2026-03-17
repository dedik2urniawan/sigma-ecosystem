-- Run this script in your Supabase SQL Editor

DROP FUNCTION IF EXISTS get_eppgbm_ciaf_comprehensive(text, text, text);

CREATE OR REPLACE FUNCTION get_eppgbm_ciaf_comprehensive(
  p_periode text,
  p_puskesmas text,
  p_kelurahan text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  v_total_pop bigint;
  v_ciaf_failures bigint;
  v_level text;
BEGIN
  v_level := CASE WHEN p_puskesmas = 'Semua' THEN 'puskesmas' ELSE 'kelurahan' END;

  WITH raw_data AS (
    SELECT 
      nik,
      jk,
      usia_saatukur::numeric AS age_months,
      CASE WHEN v_level = 'puskesmas' THEN puskesmas ELSE kelurahan END AS area,
      zs_tbu,
      zs_bbtb,
      zs_bbu,
      -- TBU (Stunting)
      CASE WHEN zs_tbu < -2 THEN true ELSE false END AS is_stunted,
      -- BBTB (Wasting)
      CASE WHEN zs_bbtb < -2 THEN true ELSE false END AS is_wasted,
      -- BBU (Underweight)
      CASE WHEN zs_bbu < -2 THEN true ELSE false END AS is_underweight
    FROM data_eppgbm
    WHERE periode = p_periode
      AND (p_puskesmas = 'Semua' OR puskesmas = p_puskesmas)
      AND (p_kelurahan = 'Semua' OR kelurahan = p_kelurahan)
      AND zs_tbu IS NOT NULL AND zs_bbtb IS NOT NULL AND zs_bbu IS NOT NULL
  ),
  classified AS (
    SELECT
      *,
      -- Age Group
      CASE 
        WHEN age_months >= 0 AND age_months <= 5 THEN '0-5 bulan'
        WHEN age_months >= 6 AND age_months <= 11 THEN '6-11 bulan'
        WHEN age_months >= 12 AND age_months <= 23 THEN '12-23 bulan'
        WHEN age_months >= 24 AND age_months <= 35 THEN '24-35 bulan'
        WHEN age_months >= 36 AND age_months <= 47 THEN '36-47 bulan'
        WHEN age_months >= 48 AND age_months <= 59 THEN '48-59 bulan'
        ELSE '>59 bulan'
      END AS age_group,
      -- CIAF Category
      CASE
        WHEN NOT is_wasted AND NOT is_underweight AND NOT is_stunted THEN 'A'
        WHEN is_wasted AND NOT is_underweight AND NOT is_stunted THEN 'B'
        WHEN is_wasted AND is_underweight AND NOT is_stunted THEN 'C'
        WHEN is_wasted AND is_underweight AND is_stunted THEN 'D'
        WHEN NOT is_wasted AND is_underweight AND is_stunted THEN 'E'
        WHEN NOT is_wasted AND NOT is_underweight AND is_stunted THEN 'F'
        WHEN NOT is_wasted AND is_underweight AND NOT is_stunted THEN 'Y'
        ELSE 'A' -- Fallback (should not happen based on logic combinations, but safe)
      END AS ciaf_cat,
      CASE
        WHEN is_wasted OR is_underweight OR is_stunted THEN true ELSE false
      END AS is_ciaf_failure
    FROM raw_data
  )
  SELECT 
    COUNT(*), 
    COUNT(CASE WHEN is_ciaf_failure THEN 1 END)
  INTO 
    v_total_pop, 
    v_ciaf_failures
  FROM classified;

  -- Build JSON
  SELECT jsonb_build_object(
    'total_population', v_total_pop,
    'ciaf_failures', v_ciaf_failures,
    'prevalence_overall', CASE WHEN v_total_pop > 0 THEN ROUND((v_ciaf_failures::numeric / v_total_pop) * 100, 2) ELSE 0 END,
    
    -- 1. Distribution by CIAF Category
    'distribution', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'category', cat.c,
          'count', COALESCE(cat_counts.c_count, 0),
          'percentage', CASE WHEN v_total_pop > 0 THEN ROUND((COALESCE(cat_counts.c_count, 0)::numeric / v_total_pop) * 100, 2) ELSE 0 END
        )
      )
      FROM (SELECT unnest(ARRAY['A', 'B', 'C', 'D', 'E', 'F', 'Y']) AS c) cat
      LEFT JOIN (
        SELECT ciaf_cat, COUNT(*) as c_count FROM classified GROUP BY ciaf_cat
      ) cat_counts ON cat.c = cat_counts.ciaf_cat
    ),

    -- 2. Prevalence by Age Group
    'by_age', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'age_group', a.grp,
          'total', COALESCE(age_stats.tot, 0),
          'failures', COALESCE(age_stats.fail, 0),
          'prevalence', CASE WHEN COALESCE(age_stats.tot, 0) > 0 THEN ROUND((COALESCE(age_stats.fail, 0)::numeric / age_stats.tot) * 100, 2) ELSE 0 END
        )
      )
      FROM (SELECT unnest(ARRAY['0-5 bulan', '6-11 bulan', '12-23 bulan', '24-35 bulan', '36-47 bulan', '48-59 bulan']) AS grp) a
      LEFT JOIN (
        SELECT age_group, COUNT(*) as tot, COUNT(CASE WHEN is_ciaf_failure THEN 1 END) as fail 
        FROM classified GROUP BY age_group
      ) age_stats ON a.grp = age_stats.age_group
    ),

    -- 3. Prevalence by Gender
    'by_gender', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'gender', g.jk,
          'total', COALESCE(g_stats.tot, 0),
          'failures', COALESCE(g_stats.fail, 0),
          'prevalence', CASE WHEN COALESCE(g_stats.tot, 0) > 0 THEN ROUND((COALESCE(g_stats.fail, 0)::numeric / g_stats.tot) * 100, 2) ELSE 0 END
        )
      )
      FROM (SELECT unnest(ARRAY['L', 'P']) AS jk) g
      LEFT JOIN (
        SELECT jk, COUNT(*) as tot, COUNT(CASE WHEN is_ciaf_failure THEN 1 END) as fail 
        FROM classified GROUP BY jk
      ) g_stats ON g.jk = g_stats.jk
    ),

    -- 4. Prevalence & Anomalies by Area
    'by_area', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'area', area_stats.area,
          'total', area_stats.tot,
          'ciaf_prevalence', CASE WHEN area_stats.tot > 0 THEN ROUND((area_stats.ciaf_fail::numeric / area_stats.tot) * 100, 2) ELSE 0 END,
          'stunting_prevalence', CASE WHEN area_stats.tot > 0 THEN ROUND((area_stats.stunt_fail::numeric / area_stats.tot) * 100, 2) ELSE 0 END,
          'wasting_prevalence', CASE WHEN area_stats.tot > 0 THEN ROUND((area_stats.waste_fail::numeric / area_stats.tot) * 100, 2) ELSE 0 END,
          'underweight_prevalence', CASE WHEN area_stats.tot > 0 THEN ROUND((area_stats.under_fail::numeric / area_stats.tot) * 100, 2) ELSE 0 END
        )
      )
      FROM (
        SELECT 
          area, 
          COUNT(*) as tot,
          COUNT(CASE WHEN is_ciaf_failure THEN 1 END) as ciaf_fail,
          COUNT(CASE WHEN is_stunted THEN 1 END) as stunt_fail,
          COUNT(CASE WHEN is_wasted THEN 1 END) as waste_fail,
          COUNT(CASE WHEN is_underweight THEN 1 END) as under_fail
        FROM classified
        GROUP BY area
      ) area_stats
    )
  ) INTO result;

  RETURN result;
END;
$$;
