-- ========================================================
-- SCHEMA UNTUK FCT CALCULATOR (FOOD COMPOSITION TABLE)
-- ========================================================

-- Pastikan untuk menjalankan ini di Supabase SQL Editor

-- 1. TABEL TKPI (Tabel Komposisi Pangan Indonesia)
CREATE TABLE public.fct_tkpi (
    id SERIAL PRIMARY KEY,
    kode_baru VARCHAR(50),
    nama_bahan_mentah VARCHAR(255) NOT NULL,
    sumber VARCHAR(100),
    kelompok VARCHAR(100),
    energi NUMERIC,
    protein NUMERIC,
    air NUMERIC,
    lemak NUMERIC,
    kh NUMERIC, -- Karbohidrat
    kalsium NUMERIC,
    besi NUMERIC,
    seng NUMERIC,
    vit_c NUMERIC,
    thiamin NUMERIC,
    riboflavin NUMERIC,
    niasin NUMERIC,
    b6 NUMERIC,
    folat NUMERIC,
    b12 NUMERIC,
    vit_a_re NUMERIC,
    vit_rae NUMERIC,
    retinol NUMERIC,
    b_kar NUMERIC,
    kartotal NUMERIC,
    bdd NUMERIC,
    kalium NUMERIC, -- Opsional
    natrium NUMERIC, -- Opsional
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABEL FAKTOR YIELD (Perubahan berat setelah masak)
CREATE TABLE public.fct_yield (
    id SERIAL PRIMARY KEY,
    metode VARCHAR(50) NOT NULL UNIQUE,
    yield_factor NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABEL FAKTOR RETENSI (Retensi nutrisi setelah masak)
CREATE TABLE public.fct_retention (
    id SERIAL PRIMARY KEY,
    metode VARCHAR(50) NOT NULL,
    nutrien VARCHAR(50) NOT NULL,
    retensi NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(metode, nutrien)
);

-- 4. TABEL REFERENSI AKG (Angka Kecukupan Gizi)
CREATE TABLE public.fct_akg_ref (
    id SERIAL PRIMARY KEY,
    kelompok VARCHAR(100) NOT NULL UNIQUE,
    jk VARCHAR(10),
    energi NUMERIC,
    protein NUMERIC,
    lemak_total NUMERIC,
    omega3 NUMERIC,
    omega6 NUMERIC,
    karbohidrat NUMERIC,
    serat NUMERIC,
    air NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Mengatur RLS (Row Level Security) agar tabel bisa dibaca public (secara anonim)
ALTER TABLE public.fct_tkpi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fct_yield ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fct_retention ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fct_akg_ref ENABLE ROW LEVEL SECURITY;

-- Membuat policy untuk akses READ (SELECT) publik
CREATE POLICY "Enable read access for all users - fct_tkpi" ON public.fct_tkpi FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users - fct_yield" ON public.fct_yield FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users - fct_retention" ON public.fct_retention FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users - fct_akg_ref" ON public.fct_akg_ref FOR SELECT USING (true);


/* 
======================================================
PETUNJUK IMPORT DATA DARI EXCEL KE SUPABASE:
======================================================
1. Buka file Excel (TKPI, Yield, atau Retention) di Excel/Google Sheets.
2. Pastikan header kolom SAMA PERSIS (huruf kecil semua, spasi diganti underscore `_`) dengan definisi tabel di atas.
   Contoh untuk TKPI: `nama_bahan_mentah`, `energi`, `protein`.
3. Save As / Download as -> CSV (Comma Separated Values).
4. Buka Supabase Dashboard project Anda (pkmk-app).
5. Masuk ke menu "Table Editor" (ikon tabel di sidebar kiri).
6. Pilih tabel yang dituju (misal: `fct_tkpi`).
7. Klik tombol "Insert" di kanan atas -> pilih "Import data from CSV".
8. Pilih file CSV yang sudah disiapkan.
9. Supabase otomatis mencocokkan header kolom CSV dengan kolom tabel database.
10. Selesai! Aplikasi SIGMA Calculator akan bisa membaca data ini.
======================================================
*/
