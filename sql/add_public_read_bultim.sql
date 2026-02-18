-- ═══════════════════════════════════════════════════════
-- Add public read access for data_bultim (for landing page live preview)
-- Run this in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════

-- Allow anonymous (public) users to SELECT from data_bultim
-- This enables the Live Dashboard Preview on the public RCS landing page
CREATE POLICY "data_bultim_public_select" ON public.data_bultim
  FOR SELECT TO anon
  USING (true);

-- ✅ DONE! The landing page can now read data_bultim without authentication.
