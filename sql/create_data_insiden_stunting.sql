-- Create data_insiden_stunting table
-- Analytics for "Analisis Insidens Stunting" (Baduta vs Balita impact)

CREATE TABLE IF NOT EXISTS public.data_insiden_stunting (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun integer NOT NULL,
  bulan integer NOT NULL,
  puskesmas text NOT NULL,
  data_sasaran integer DEFAULT 0,
  jumlah_timbang_ukur integer DEFAULT 0,
  stunting integer DEFAULT 0,
  insiden_l integer DEFAULT 0, -- 0-59 bln Laki-laki
  insiden_p integer DEFAULT 0, -- 0-59 bln Perempuan
  insiden_l_baduta integer DEFAULT 0, -- 0-23 bln Laki-laki increases
  insiden_p_baduta integer DEFAULT 0, -- 0-23 bln Perempuan
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  uploaded_by uuid,
  UNIQUE(tahun, bulan, puskesmas)
);

-- Enable RLS
ALTER TABLE public.data_insiden_stunting ENABLE ROW LEVEL SECURITY;

-- Select: ALL authenticated users can read (Global Benchmarking)
-- "untuk analisis ini antara superadmin dan admin_puskesmas bisa akses semuanya"
CREATE POLICY "data_insiden_stunting_select" ON public.data_insiden_stunting
  FOR SELECT TO authenticated USING (true);

-- Insert/Update/Delete: Superadmin only
CREATE POLICY "data_insiden_stunting_insert" ON public.data_insiden_stunting
  FOR INSERT TO authenticated WITH CHECK (public.is_superadmin());

CREATE POLICY "data_insiden_stunting_update" ON public.data_insiden_stunting
  FOR UPDATE TO authenticated USING (public.is_superadmin());

CREATE POLICY "data_insiden_stunting_delete" ON public.data_insiden_stunting
  FOR DELETE TO authenticated USING (public.is_superadmin());

-- Indexes
CREATE INDEX idx_insiden_stunting_period ON public.data_insiden_stunting (tahun, bulan);
CREATE INDEX idx_insiden_stunting_puskesmas ON public.data_insiden_stunting (puskesmas);
