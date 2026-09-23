-- ==============================================================================
-- SCHEMA MIGRATION: Tabel Data Indikator Remaja Putri (SIGMA RCS 2026)
-- Target Database: Supabase PostgreSQL (public.data_remaja_putri)
-- Sesuai Form SIGIZI KESGA & PRD_SIGMA_RCS_Indikator_Remaja_Putri_2026.md
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.data_remaja_putri (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Wilayah & Periode Kalender
    tahun integer NOT NULL DEFAULT 2026,
    bulan integer NOT NULL, -- 1 s/d 12
    kab_kota text DEFAULT 'KABUPATEN MALANG',
    kecamatan text,
    puskesmas text NOT NULL,
    kelurahan text NOT NULL,

    -- Periode Tahun Ajaran (Academic Year)
    academic_year text DEFAULT '2025/2026', -- Contoh: '2025/2026', '2026/2027'
    academic_year_start integer DEFAULT 2025,
    academic_year_end integer DEFAULT 2026,
    academic_month_index integer DEFAULT 1, -- 1 (Juli) s/d 12 (Juni)
    
    -- Sasaran Remaja Putri
    target_rematri integer DEFAULT 0, -- Jumlah sasaran remaja putri
    
    -- Tablet Tambah Darah (TTD)
    ttd_received_standard integer DEFAULT 0, -- Jumlah remaja putri di satuan pendidikan mendapat TTD sesuai standar
    ttd_consumed_standard integer DEFAULT 0, -- Jumlah remaja putri di satuan pendidikan mengonsumsi TTD sesuai standar
    ttd_received_lt26 integer DEFAULT 0,     -- Jumlah remaja putri mendapat TTD sampai bulan ini — < 26 tablet
    ttd_received_ge26 integer DEFAULT 0,     -- Jumlah remaja putri mendapat TTD sampai bulan ini — >= 26 tablet
    ttd_consumed_lt26 integer DEFAULT 0,     -- Jumlah remaja putri mengonsumsi TTD sampai bulan ini — < 26 tablet
    ttd_consumed_ge26 integer DEFAULT 0,     -- Jumlah remaja putri mengonsumsi TTD sampai bulan ini — >= 26 tablet
    
    -- Skrining Anemia Siswi Kelas 7 & Kelas 10
    target_grade7 integer DEFAULT 0,             -- Jumlah remaja putri kelas 7 di satuan pendidikan sampai bulan ini
    screened_grade7 integer DEFAULT 0,           -- Jumlah remaja putri kelas 7 yang skrining anemia sampai bulan ini
    target_grade10 integer DEFAULT 0,            -- Jumlah remaja putri kelas 10 di satuan pendidikan sampai bulan ini
    screened_grade10 integer DEFAULT 0,          -- Jumlah remaja putri kelas 10 yang skrining anemia sampai bulan ini
    target_grade7_10_uploaded integer DEFAULT 0,  -- Jumlah remaja putri kelas 7 dan 10 di satuan pendidikan sampai bulan ini
    screened_grade7_10_uploaded integer DEFAULT 0,-- Jumlah remaja putri kelas 7 dan 10 yang skrining anemia sampai bulan ini
    
    -- Hasil Skrining Anemia: Siswi Kelas 7
    anemia_grade7_mild integer DEFAULT 0,         -- Remaja putri kelas 7 teridentifikasi anemia — Anemia ringan (11–11.9 g/dl)
    anemia_grade7_moderate integer DEFAULT 0,     -- Remaja putri kelas 7 teridentifikasi anemia — Anemia sedang (8–10.9 g/dl)
    anemia_grade7_severe integer DEFAULT 0,       -- Remaja putri kelas 7 teridentifikasi anemia — Anemia berat (<8 g/dl)
    anemia_grade7_total_uploaded integer DEFAULT 0,-- Jumlah remaja putri kelas 7 teridentifikasi anemia — Total
    
    -- Hasil Skrining Anemia: Siswi Kelas 10
    anemia_grade10_mild integer DEFAULT 0,        -- Remaja putri kelas 10 teridentifikasi anemia — Anemia ringan (11–11.9 g/dl)
    anemia_grade10_moderate integer DEFAULT 0,    -- Remaja putri kelas 10 teridentifikasi anemia — Anemia sedang (8–10.9 g/dl)
    anemia_grade10_severe integer DEFAULT 0,      -- Remaja putri kelas 10 teridentifikasi anemia — Anemia berat (<8 g/dl)
    anemia_grade10_total_uploaded integer DEFAULT 0,-- Jumlah remaja putri kelas 10 teridentifikasi anemia — Total
    
    -- Total Anemia (Kelas 7 & 10) & Tatalaksana
    anemia_total_uploaded integer DEFAULT 0,      -- Jumlah remaja putri kelas 7 dan 10 yang teridentifikasi anemia sampai bulan ini
    anemia_treated integer DEFAULT 0,             -- Jumlah Rematri kelas 7 dan 10 mendapatkan tatalaksana anemia sampai bulan ini
    
    -- Audit & Meta
    waktu_input timestamptz DEFAULT now(),
    uploaded_at timestamptz DEFAULT now(),
    uploaded_by uuid,
    
    -- Unique constraint untuk integritas per level desa per periode
    CONSTRAINT uq_data_remaja_putri_desa_period UNIQUE (tahun, bulan, puskesmas, kelurahan)
);

-- Index performa query agregasi dashboard
CREATE INDEX IF NOT EXISTS idx_rematri_period ON public.data_remaja_putri (tahun, bulan);
CREATE INDEX IF NOT EXISTS idx_rematri_academic_year ON public.data_remaja_putri (academic_year);
CREATE INDEX IF NOT EXISTS idx_rematri_puskesmas ON public.data_remaja_putri (puskesmas);
CREATE INDEX IF NOT EXISTS idx_rematri_kelurahan ON public.data_remaja_putri (kelurahan);
CREATE INDEX IF NOT EXISTS idx_rematri_lookup ON public.data_remaja_putri (tahun, puskesmas, bulan);

-- Enable Row Level Security (RLS)
ALTER TABLE public.data_remaja_putri ENABLE ROW LEVEL SECURITY;

-- Policy SELECT: Semua user terautentikasi dapat membaca data
DROP POLICY IF EXISTS "data_remaja_putri_select" ON public.data_remaja_putri;
CREATE POLICY "data_remaja_putri_select" ON public.data_remaja_putri
    FOR SELECT TO authenticated USING (true);

-- Policy DML: Superadmin dapat INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "data_remaja_putri_insert" ON public.data_remaja_putri;
CREATE POLICY "data_remaja_putri_insert" ON public.data_remaja_putri
    FOR INSERT TO authenticated WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "data_remaja_putri_update" ON public.data_remaja_putri;
CREATE POLICY "data_remaja_putri_update" ON public.data_remaja_putri
    FOR UPDATE TO authenticated USING (public.is_superadmin());

DROP POLICY IF EXISTS "data_remaja_putri_delete" ON public.data_remaja_putri;
CREATE POLICY "data_remaja_putri_delete" ON public.data_remaja_putri
    FOR DELETE TO authenticated USING (public.is_superadmin());

-- Allow public read if needed for dashboards that support anonymous view
DROP POLICY IF EXISTS "data_remaja_putri_public_select" ON public.data_remaja_putri;
CREATE POLICY "data_remaja_putri_public_select" ON public.data_remaja_putri
    FOR SELECT TO anon USING (true);
