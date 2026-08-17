-- ============================================================
--  BIMTEK RS — Schema Migration
--  Dinas Kesehatan Kabupaten Malang — SIGMA RCS v2.0
--  Domain: Supervisi Gizi Rumah Sakit
-- ============================================================

-- ─── 1. Master Data Rumah Sakit ────────────────────────────
CREATE TABLE IF NOT EXISTS ref_rumah_sakit (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed 24 Rumah Sakit
INSERT INTO ref_rumah_sakit (nama) VALUES
    ('RS Bala Keselamatan Bokor'),
    ('RS Jiwa Dr. Radjiman Wediodiningrat Lawang'),
    ('RSUD Kanjuruhan Kepanjen Kab. Malang'),
    ('RSUD Lawang'),
    ('RS Umum Wava Husada Kepanjen'),
    ('RS Mitra Delima'),
    ('RS Prasetya Husada'),
    ('RS Siti Miriam'),
    ('RS Angkatan Udara dr. Mohammad Moenir'),
    ('RS Prima Husada'),
    ('RS Lawang Medika'),
    ('RS Ben Mari'),
    ('RS Umum Universitas Muhammadiyah Malang'),
    ('RS Singhasari Medika'),
    ('RS Umum Salsabila Husada'),
    ('RS Umum Pindad'),
    ('RS Umum Wajak Husada'),
    ('RS Umum Islam Gondanglegi'),
    ('RS Sumber Sentosa'),
    ('RS Umum Islam Madinah Kasembon'),
    ('RS Bedah Hasta Husada'),
    ('RS Enggal Dangan'),
    ('RS Bantuan 05.08.04 Lawang'),
    ('RS Marsudi Waluyo')
ON CONFLICT (nama) DO NOTHING;

-- ─── 2. Sesi Supervisi Gizi RS ─────────────────────────────
CREATE TABLE IF NOT EXISTS supervisi_rs_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rs_id               UUID NOT NULL REFERENCES ref_rumah_sakit(id) ON DELETE CASCADE,
    tanggal_supervisi   DATE NOT NULL DEFAULT CURRENT_DATE,
    tim_supervisor      TEXT,
    penanggung_jawab    TEXT,
    status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
    created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supervisi_rs_sessions_rs_id ON supervisi_rs_sessions(rs_id);
CREATE INDEX IF NOT EXISTS idx_supervisi_rs_sessions_status ON supervisi_rs_sessions(status);

-- ─── 3. Item Penilaian Supervisi RS (score 0/1/2) ──────────
CREATE TABLE IF NOT EXISTS supervisi_rs_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES supervisi_rs_sessions(id) ON DELETE CASCADE,
    section         TEXT NOT NULL,
    item_number     INT  NOT NULL,
    item_label      TEXT NOT NULL,
    score           SMALLINT CHECK (score IN (0, 1, 2)),   -- 0=tidak ada, 1=tidak lengkap, 2=lengkap
    bukti_url       TEXT,
    catatan         TEXT,
    rtl             TEXT,    -- Rencana Tindak Lanjut per item
    UNIQUE(session_id, section, item_number)
);

CREATE INDEX IF NOT EXISTS idx_supervisi_rs_items_session ON supervisi_rs_items(session_id);

-- ─── 4. Sesi Berita Acara Bimtek RS ────────────────────────
CREATE TABLE IF NOT EXISTS ba_rs_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rs_id               UUID NOT NULL REFERENCES ref_rumah_sakit(id) ON DELETE CASCADE,
    rs_name             TEXT NOT NULL,
    tanggal_kegiatan    DATE NOT NULL DEFAULT CURRENT_DATE,
    tempat_kegiatan     TEXT,
    status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
    -- PJ Dinkes (penanda tangan kiri)
    pj_dinkes_nama      TEXT,
    pj_dinkes_nip       TEXT,
    -- Direktur / Pimpinan RS (penanda tangan kanan)
    direktur_rs_nama    TEXT,
    direktur_rs_nip     TEXT,
    created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ba_rs_sessions_rs_id ON ba_rs_sessions(rs_id);

-- ─── 5. Item Program Berita Acara RS ───────────────────────
CREATE TABLE IF NOT EXISTS ba_rs_items (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id              UUID NOT NULL REFERENCES ba_rs_sessions(id) ON DELETE CASCADE,
    program                 TEXT NOT NULL CHECK (program IN ('kia', 'gizi')),
    program_label           TEXT NOT NULL,
    item_order              INT  NOT NULL,
    hasil_supervisi         TEXT,
    rencana_tindak_lanjut   TEXT
);

CREATE INDEX IF NOT EXISTS idx_ba_rs_items_session ON ba_rs_items(session_id);

-- ─── 6. Storage Bucket untuk Bukti Supervisi RS ────────────
-- Jalankan di Supabase Dashboard → Storage → Create bucket:
-- Nama: supervisi-rs-bukti | Public: true
-- (tidak bisa dibuat via SQL, lakukan manual di dashboard)

-- ─── 7. Row Level Security (RLS) ───────────────────────────

-- ref_rumah_sakit: semua authenticated users bisa read
ALTER TABLE ref_rumah_sakit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ref_rs_authenticated_read" ON ref_rumah_sakit
    FOR SELECT TO authenticated USING (true);

-- supervisi_rs_sessions: RLS
ALTER TABLE supervisi_rs_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supervisi_rs_sessions_select" ON supervisi_rs_sessions
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "supervisi_rs_sessions_insert" ON supervisi_rs_sessions
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "supervisi_rs_sessions_update" ON supervisi_rs_sessions
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "supervisi_rs_sessions_delete" ON supervisi_rs_sessions
    FOR DELETE TO authenticated USING (true);

-- supervisi_rs_items: RLS
ALTER TABLE supervisi_rs_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supervisi_rs_items_select" ON supervisi_rs_items
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "supervisi_rs_items_insert" ON supervisi_rs_items
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "supervisi_rs_items_update" ON supervisi_rs_items
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "supervisi_rs_items_delete" ON supervisi_rs_items
    FOR DELETE TO authenticated USING (true);

-- ba_rs_sessions: RLS
ALTER TABLE ba_rs_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ba_rs_sessions_select" ON ba_rs_sessions
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "ba_rs_sessions_insert" ON ba_rs_sessions
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ba_rs_sessions_update" ON ba_rs_sessions
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ba_rs_sessions_delete" ON ba_rs_sessions
    FOR DELETE TO authenticated USING (true);

-- ba_rs_items: RLS
ALTER TABLE ba_rs_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ba_rs_items_select" ON ba_rs_items
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "ba_rs_items_insert" ON ba_rs_items
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ba_rs_items_update" ON ba_rs_items
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ba_rs_items_delete" ON ba_rs_items
    FOR DELETE TO authenticated USING (true);

-- ─── 8. Helper Function: Updated_at trigger ────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_supervisi_rs_sessions_updated_at
    BEFORE UPDATE ON supervisi_rs_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ba_rs_sessions_updated_at
    BEFORE UPDATE ON ba_rs_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
