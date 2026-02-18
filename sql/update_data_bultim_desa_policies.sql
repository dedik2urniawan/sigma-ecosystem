-- Update RLS policies for data_bultim_desa to allow Admin upload
-- Drop strict superadmin-only policies
DROP POLICY IF EXISTS "data_bultim_desa_insert" ON public.data_bultim_desa;
DROP POLICY IF EXISTS "data_bultim_desa_delete" ON public.data_bultim_desa;
DROP POLICY IF EXISTS "data_bultim_desa_update" ON public.data_bultim_desa;

-- Allow INSERT if uploaded_by matches auth.uid()
CREATE POLICY "data_bultim_desa_insert" ON public.data_bultim_desa
  FOR INSERT TO authenticated 
  WITH CHECK ((select auth.uid()) = uploaded_by);

-- Allow DELETE if uploaded_by matches auth.uid()
-- This ensures Admins can only delete data they uploaded
CREATE POLICY "data_bultim_desa_delete" ON public.data_bultim_desa
  FOR DELETE TO authenticated 
  USING ((select auth.uid()) = uploaded_by);

-- Allow UPDATE if uploaded_by matches auth.uid()
CREATE POLICY "data_bultim_desa_update" ON public.data_bultim_desa
  FOR UPDATE TO authenticated 
  USING ((select auth.uid()) = uploaded_by);
