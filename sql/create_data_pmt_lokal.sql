-- Migration: Skema Data Analisis PMT Lokal (Balita & Ibu Hamil)
-- Sesuai PRD_SIGMA_RCS_Analisis_PMT_Lokal_Balita_Bumil_KEK_2026.md

-- 1. Tabel Riwayat PMT Lokal Balita (Gizi Kurang, Underweight, T)
CREATE TABLE IF NOT EXISTS public.data_pmt_balita (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tahun INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    bulan_intake INT, -- 1 s/d 12 (berdasarkan tanggal pengukuran awal/mulai)
    person_key TEXT, -- HMAC-SHA256 atau hash anonim
    nik_masked TEXT, -- e.g. 350701******0001
    nama_balita TEXT NOT NULL,
    jenis_kelamin VARCHAR(5), -- L / P
    tanggal_lahir DATE,
    usia_bulan_awal INT,
    provinsi TEXT DEFAULT 'Jawa Timur',
    kab_kota TEXT DEFAULT 'Kabupaten Malang',
    kecamatan TEXT,
    puskesmas TEXT NOT NULL,
    desa_kel TEXT NOT NULL,
    posyandu TEXT,
    indikasi VARCHAR(30) NOT NULL, -- 'gizi_kurang' | 'underweight' | 't'
    
    -- Baseline Pengukuran Awal
    tanggal_pengukuran_awal DATE,
    bb_awal NUMERIC(6, 2), -- kg
    tb_awal NUMERIC(6, 2), -- cm
    zs_bbu_awal NUMERIC(6, 2),
    zs_tbu_awal NUMERIC(6, 2),
    zs_bbtb_awal NUMERIC(6, 2),
    kategori_bbu_awal TEXT,
    kategori_tbu_awal TEXT,
    kategori_bbtb_awal TEXT,
    status_pertumbuhan_awal TEXT, -- N / T / O / B
    
    -- Outcome Pengukuran Akhir
    tanggal_pengukuran_akhir DATE,
    bb_akhir NUMERIC(6, 2), -- kg
    tb_akhir NUMERIC(6, 2), -- cm
    zs_bbu_akhir NUMERIC(6, 2),
    zs_tbu_akhir NUMERIC(6, 2),
    zs_bbtb_akhir NUMERIC(6, 2),
    kategori_bbu_akhir TEXT,
    kategori_tbu_akhir TEXT,
    kategori_bbtb_akhir TEXT,
    status_pertumbuhan_akhir TEXT,
    status_kenaikan_bb TEXT, -- N / T
    
    -- Program Provenance
    sumber_anggaran TEXT,
    mitra TEXT,
    siklus_pmt INT DEFAULT 1,
    jumlah_pemantauan INT DEFAULT 0,
    
    -- DQA Flags & Metadata
    dqa_flags TEXT[] DEFAULT '{}',
    is_appropriate BOOLEAN DEFAULT TRUE,
    is_recovered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Riwayat PMT Lokal Ibu Hamil (KEK & Risiko KEK)
CREATE TABLE IF NOT EXISTS public.data_pmt_bumil (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tahun INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    bulan_intake INT,
    person_key TEXT,
    nik_masked TEXT,
    nama_bumil TEXT NOT NULL,
    tanggal_lahir DATE,
    usia_tahun INT,
    provinsi TEXT DEFAULT 'Jawa Timur',
    kab_kota TEXT DEFAULT 'Kabupaten Malang',
    kecamatan TEXT,
    puskesmas TEXT NOT NULL,
    desa_kel TEXT NOT NULL,
    posyandu TEXT,
    alasan_diberi TEXT NOT NULL, -- 'Kurang Energi Kronis' | 'Risiko Kurang Energi Kronis'
    
    -- Tanggal Program & Pengukuran
    tanggal_mulai_pmt DATE,
    tanggal_selesai_pmt DATE,
    usia_kehamilan_minggu INT,
    trimester_intake INT, -- 1 | 2 | 3
    lila_cm NUMERIC(5, 2),
    bb_awal NUMERIC(6, 2), -- kg
    bb_akhir NUMERIC(6, 2), -- kg
    delta_bb NUMERIC(6, 2), -- kg
    
    -- Evaluasi Program
    hasil_pemberian TEXT, -- 'Sesuai' | 'Tidak Sesuai' | '-'
    status_pmt TEXT, -- 'Selesai' | 'Dalam Proses' | '-'
    siklus_pmt INT DEFAULT 1,
    jumlah_pemantauan INT DEFAULT 0,
    sumber_anggaran TEXT,
    
    -- DQA Flags & Metadata
    dqa_flags TEXT[] DEFAULT '{}',
    is_appropriate BOOLEAN DEFAULT TRUE,
    meets_gain_target BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes untuk kueri cepat dashboard
CREATE INDEX IF NOT EXISTS idx_pmt_balita_tahun_bulan ON public.data_pmt_balita (tahun, bulan_intake);
CREATE INDEX IF NOT EXISTS idx_pmt_balita_puskesmas ON public.data_pmt_balita (puskesmas);
CREATE INDEX IF NOT EXISTS idx_pmt_balita_indikasi ON public.data_pmt_balita (indikasi);

CREATE INDEX IF NOT EXISTS idx_pmt_bumil_tahun_bulan ON public.data_pmt_bumil (tahun, bulan_intake);
CREATE INDEX IF NOT EXISTS idx_pmt_bumil_puskesmas ON public.data_pmt_bumil (puskesmas);
CREATE INDEX IF NOT EXISTS idx_pmt_bumil_alasan ON public.data_pmt_bumil (alasan_diberi);

-- Enable RLS & Allow read/write for authenticated and public anon keys (dashboard)
ALTER TABLE public.data_pmt_balita ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_pmt_bumil ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read data_pmt_balita" ON public.data_pmt_balita FOR SELECT USING (true);
CREATE POLICY "Allow public insert data_pmt_balita" ON public.data_pmt_balita FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update data_pmt_balita" ON public.data_pmt_balita FOR UPDATE USING (true);
CREATE POLICY "Allow public delete data_pmt_balita" ON public.data_pmt_balita FOR DELETE USING (true);

CREATE POLICY "Allow public read data_pmt_bumil" ON public.data_pmt_bumil FOR SELECT USING (true);
CREATE POLICY "Allow public insert data_pmt_bumil" ON public.data_pmt_bumil FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update data_pmt_bumil" ON public.data_pmt_bumil FOR UPDATE USING (true);
CREATE POLICY "Allow public delete data_pmt_bumil" ON public.data_pmt_bumil FOR DELETE USING (true);
