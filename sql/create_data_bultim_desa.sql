-- Create data_bultim_desa table
-- Level Desa/Kelurahan pelayanan kesehatan data

CREATE TABLE IF NOT EXISTS public.data_bultim_desa (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun integer NOT NULL,
  bulan integer NOT NULL,
  puskesmas text NOT NULL,
  kelurahan text NOT NULL,
  data_sasaran_l integer DEFAULT 0,
  data_sasaran_p integer DEFAULT 0,
  bb_sangat_kurang integer DEFAULT 0,
  bb_kurang integer DEFAULT 0,
  berat_badan_normal integer DEFAULT 0,
  risiko_lebih integer DEFAULT 0,
  bb_outlier integer DEFAULT 0,
  sangat_pendek integer DEFAULT 0,
  pendek integer DEFAULT 0,
  tb_normal integer DEFAULT 0,
  tinggi integer DEFAULT 0,
  tb_outlier integer DEFAULT 0,
  gizi_buruk integer DEFAULT 0,
  gizi_kurang integer DEFAULT 0,
  normal integer DEFAULT 0,
  risiko_gizi_lebih integer DEFAULT 0,
  gizi_lebih integer DEFAULT 0,
  obesitas integer DEFAULT 0,
  stunting integer DEFAULT 0,
  wasting integer DEFAULT 0,
  underweight integer DEFAULT 0,
  jumlah_timbang integer DEFAULT 0,
  jumlah_ukur integer DEFAULT 0,
  jumlah_timbang_ukur integer DEFAULT 0,
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by uuid,
  UNIQUE(tahun, bulan, puskesmas, kelurahan)
);

-- Enable RLS
ALTER TABLE public.data_bultim_desa ENABLE ROW LEVEL SECURITY;

-- Select: all authenticated users can read
CREATE POLICY "data_bultim_desa_select" ON public.data_bultim_desa
  FOR SELECT TO authenticated USING (true);

-- Insert/Update/Delete: superadmin only (using is_superadmin function)
CREATE POLICY "data_bultim_desa_insert" ON public.data_bultim_desa
  FOR INSERT TO authenticated WITH CHECK (public.is_superadmin());

CREATE POLICY "data_bultim_desa_update" ON public.data_bultim_desa
  FOR UPDATE TO authenticated USING (public.is_superadmin());

CREATE POLICY "data_bultim_desa_delete" ON public.data_bultim_desa
  FOR DELETE TO authenticated USING (public.is_superadmin());

-- Index for fast filtering
CREATE INDEX idx_bultim_desa_period ON public.data_bultim_desa (tahun, bulan);
CREATE INDEX idx_bultim_desa_puskesmas ON public.data_bultim_desa (puskesmas);
CREATE INDEX idx_bultim_desa_kelurahan ON public.data_bultim_desa (kelurahan);
