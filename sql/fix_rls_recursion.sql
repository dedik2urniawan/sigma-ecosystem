-- ═══════════════════════════════════════════════════════
-- FIX: Infinite Recursion in RLS Policies
-- Run this ENTIRE script in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════

-- STEP 1: Create a SECURITY DEFINER function to check superadmin status
-- This function bypasses RLS, preventing infinite recursion
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE id = auth.uid()
    AND role = 'superadmin'
  );
$$;

-- STEP 2: Drop ALL existing policies on app_users to start clean
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'app_users' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.app_users', pol.policyname);
  END LOOP;
END $$;

-- STEP 3: Create clean, non-recursive policies for app_users
-- SELECT: all authenticated users can read all app_users (needed for sidebar, name lookups)
CREATE POLICY "app_users_select" ON public.app_users
  FOR SELECT TO authenticated
  USING (true);

-- UPDATE: users can only update their own row
CREATE POLICY "app_users_update_own" ON public.app_users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT: only superadmin (uses the SECURITY DEFINER function)
CREATE POLICY "app_users_insert_superadmin" ON public.app_users
  FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin());

-- DELETE: only superadmin
CREATE POLICY "app_users_delete_superadmin" ON public.app_users
  FOR DELETE TO authenticated
  USING (public.is_superadmin());

-- STEP 4: Drop ALL existing policies on data_bultim
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'data_bultim' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.data_bultim', pol.policyname);
  END LOOP;
END $$;

-- STEP 5: Create clean policies for data_bultim using the function
-- SELECT: all authenticated users
CREATE POLICY "data_bultim_select" ON public.data_bultim
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: superadmin only
CREATE POLICY "data_bultim_insert" ON public.data_bultim
  FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin());

-- UPDATE: superadmin only
CREATE POLICY "data_bultim_update" ON public.data_bultim
  FOR UPDATE TO authenticated
  USING (public.is_superadmin());

-- DELETE: superadmin only
CREATE POLICY "data_bultim_delete" ON public.data_bultim
  FOR DELETE TO authenticated
  USING (public.is_superadmin());

-- ✅ DONE! All policies now use is_superadmin() which bypasses RLS.
