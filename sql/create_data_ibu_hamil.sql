-- ==============================================================================
-- SCHEMA MIGRATION: Tabel Data Indikator Ibu Hamil (SIGMA RCS 2026)
-- Target Database: Supabase PostgreSQL (public.data_ibu_hamil)
-- Sesuai Form SIGIZI KESGA & PRD_SIGMA_RCS_Indikator_Ibu_Hamil_2026.md
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.data_ibu_hamil (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Wilayah & Periode
    tahun integer NOT NULL DEFAULT 2026,
    bulan integer NOT NULL, -- 1 s/d 12
    kab_kota text DEFAULT 'KABUPATEN MALANG',
    kecamatan text,
    puskesmas text NOT NULL,
    kelurahan text NOT NULL,
    
    -- Domain A: Anemia
    hb_checked integer DEFAULT 0,                        -- Jumlah ibu hamil periksa Hb sampai bulan ini
    anemia_mild integer DEFAULT 0,                       -- Anemia ringan (10-10.9 g/dl)
    anemia_moderate integer DEFAULT 0,                   -- Anemia sedang (7-9.9 g/dl)
    anemia_severe integer DEFAULT 0,                     -- Anemia berat (< 7 g/dl)
    anemia_total_uploaded integer DEFAULT 0,             -- Jumlah ibu hamil anemia sampai bulan ini (uploaded)
    anemia_mild_ttd integer DEFAULT 0,                   -- Jumlah ibu hamil anemia ringan yang mendapat TTD oral sampai bulan ini
    anemia_modsev_advanced integer DEFAULT 0,            -- Jumlah ibu hamil anemia sedang dan berat yang mendapatkan tata laksana di tingkat lanjutan sampai bulan ini
    
    -- Sasaran Proyeksi Ibu Hamil
    target_pregnant integer DEFAULT 0,                   -- Jumlah Sasaran Ibu Hamil
    
    -- Domain B: Suplementasi Gizi
    received_mms_180 integer DEFAULT 0,                  -- Jumlah ibu hamil mendapat minimal 180 tablet MMS sampai bulan ini
    received_ttd_180 integer DEFAULT 0,                  -- Jumlah ibu hamil mendapat minimal 180 tablet TTD sampai bulan ini
    received_supplement_total_uploaded integer DEFAULT 0, -- Jumlah ibu hamil mendapat suplementasi gizi (minimal 180 tablet TTD dan MMS) sampai bulan ini
    consumed_mms_180 integer DEFAULT 0,                  -- Jumlah ibu hamil mengonsumsi minimal 180 tablet MMS sampai bulan ini
    consumed_ttd_180 integer DEFAULT 0,                  -- Jumlah ibu hamil mengonsumsi minimal 180 tablet TTD sampai bulan ini
    consumed_supplement_total_uploaded integer DEFAULT 0, -- Jumlah ibu hamil mengonsumsi suplementasi gizi (minimal 180 tablet TTD dan MMS) sampai bulan ini
    
    -- Domain C: KEK & PMT
    lila_imt_measured integer DEFAULT 0,                 -- Jumlah ibu hamil diukur LILA dan/atau IMT sampai bulan ini
    kek_risk integer DEFAULT 0,                          -- Jumlah ibu hamil risiko KEK/KEK sampai bulan ini
    kek_management_target integer DEFAULT 0,             -- Jumlah sasaran bumil KEK ditatalaksana sampai bulan ini
    kek_received_pmt integer DEFAULT 0,                  -- Jumlah ibu hamil KEK mendapat makanan tambahan sampai bulan ini
    
    -- Domain D: Pemeriksaan Kehamilan / ANC
    pregnant_total integer DEFAULT 0,                    -- Jumlah ibu hamil sampai bulan ini
    delivery_total integer DEFAULT 0,                    -- Jumlah ibu bersalin sampai bulan ini
    k1_access integer DEFAULT 0,                         -- Jumlah ibu hamil yang mendapat pelayanan antenatal pertama (K1 akses) sampai bulan ini
    k1_pure integer DEFAULT 0,                           -- Jumlah ibu hamil yang mendapat pelayanan antenatal pertama di Trimester 1 (K1 murni) sampai bulan ini
    anc_t1_doctor integer DEFAULT 0,                     -- Jumlah ibu hamil ANC Trimester 1 dengan Dokter sampai bulan ini
    anc_t1_usg integer DEFAULT 0,                        -- Jumlah ibu hamil ANC Trimester 1 dengan USG sampai bulan ini
    anc_t3_doctor integer DEFAULT 0,                     -- Jumlah ibu hamil ANC Trimester 3 dengan Dokter sampai bulan ini
    anc_t3_usg integer DEFAULT 0,                        -- Jumlah ibu hamil ANC Trimester 3 dengan USG sampai bulan ini
    k6_delivery integer DEFAULT 0,                       -- Jumlah ibu bersalin K6 sampai bulan ini
    anc_12t_delivery integer DEFAULT 0,                  -- Jumlah ibu bersalin yang mendapat pemeriksaan 12T selama kehamilan sampai bulan ini
    
    -- Audit & Meta
    waktu_input timestamptz DEFAULT now(),
    uploaded_at timestamptz DEFAULT now(),
    uploaded_by uuid,
    
    -- Unique constraint untuk integritas per level desa per periode
    CONSTRAINT uq_data_ibu_hamil_desa_period UNIQUE (tahun, bulan, puskesmas, kelurahan)
);

-- Index performa query agregasi dashboard
CREATE INDEX IF NOT EXISTS idx_ibu_hamil_period ON public.data_ibu_hamil (tahun, bulan);
CREATE INDEX IF NOT EXISTS idx_ibu_hamil_puskesmas ON public.data_ibu_hamil (puskesmas);
CREATE INDEX IF NOT EXISTS idx_ibu_hamil_kelurahan ON public.data_ibu_hamil (kelurahan);
CREATE INDEX IF NOT EXISTS idx_ibu_hamil_lookup ON public.data_ibu_hamil (tahun, puskesmas, bulan);

-- Enable Row Level Security (RLS)
ALTER TABLE public.data_ibu_hamil ENABLE ROW LEVEL SECURITY;

-- Policy SELECT: Semua user terautentikasi dapat membaca data
DROP POLICY IF EXISTS "data_ibu_hamil_select" ON public.data_ibu_hamil;
CREATE POLICY "data_ibu_hamil_select" ON public.data_ibu_hamil
    FOR SELECT TO authenticated USING (true);

-- Policy DML: Superadmin dapat INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "data_ibu_hamil_insert" ON public.data_ibu_hamil;
CREATE POLICY "data_ibu_hamil_insert" ON public.data_ibu_hamil
    FOR INSERT TO authenticated WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "data_ibu_hamil_update" ON public.data_ibu_hamil;
CREATE POLICY "data_ibu_hamil_update" ON public.data_ibu_hamil
    FOR UPDATE TO authenticated USING (public.is_superadmin());

DROP POLICY IF EXISTS "data_ibu_hamil_delete" ON public.data_ibu_hamil;
CREATE POLICY "data_ibu_hamil_delete" ON public.data_ibu_hamil
    FOR DELETE TO authenticated USING (public.is_superadmin());

-- Allow public read if needed for dashboards that support anonymous view
DROP POLICY IF EXISTS "data_ibu_hamil_public_select" ON public.data_ibu_hamil;
CREATE POLICY "data_ibu_hamil_public_select" ON public.data_ibu_hamil
    FOR SELECT TO anon USING (true);
