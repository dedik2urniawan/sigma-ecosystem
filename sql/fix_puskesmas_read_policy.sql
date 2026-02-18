-- Enable Read Access for ref_puskesmas table (Corrected Table Name)
-- This allows logged-in users (like admin_puskesmas) to look up their own Puskesmas Name

-- Ensure RLS is enabled
ALTER TABLE public.ref_puskesmas ENABLE ROW LEVEL SECURITY;

-- Drop existing select policy if any
DROP POLICY IF EXISTS "ref_puskesmas_select_auth" ON public.ref_puskesmas;

-- Create policy to allow all authenticated users to read puskesmas names
CREATE POLICY "ref_puskesmas_select_auth" ON public.ref_puskesmas
  FOR SELECT TO authenticated 
  USING (true);
