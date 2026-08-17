-- ═══════════════════════════════════════════════════════════════
-- FIX RLS POLICIES FOR BIMTEK RS TABLES
-- Run this script in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Drop Old Restrictive Policies ──────────────────────────
DROP POLICY IF EXISTS "supervisi_rs_sessions_select" ON public.supervisi_rs_sessions;
DROP POLICY IF EXISTS "supervisi_rs_sessions_insert" ON public.supervisi_rs_sessions;
DROP POLICY IF EXISTS "supervisi_rs_sessions_update" ON public.supervisi_rs_sessions;
DROP POLICY IF EXISTS "supervisi_rs_sessions_delete" ON public.supervisi_rs_sessions;

DROP POLICY IF EXISTS "supervisi_rs_items_select" ON public.supervisi_rs_items;
DROP POLICY IF EXISTS "supervisi_rs_items_write" ON public.supervisi_rs_items;

DROP POLICY IF EXISTS "ba_rs_sessions_select" ON public.ba_rs_sessions;
DROP POLICY IF EXISTS "ba_rs_sessions_write" ON public.ba_rs_sessions;

DROP POLICY IF EXISTS "ba_rs_items_select" ON public.ba_rs_items;
DROP POLICY IF EXISTS "ba_rs_items_write" ON public.ba_rs_items;

DROP POLICY IF EXISTS "ref_rs_authenticated_read" ON public.ref_rumah_sakit;

-- ─── 2. Enable RLS on All Bimtek RS Tables ────────────────────
ALTER TABLE public.ref_rumah_sakit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisi_rs_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisi_rs_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ba_rs_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ba_rs_items ENABLE ROW LEVEL SECURITY;

-- ─── 3. ref_rumah_sakit: Read-only for all authenticated users ──
CREATE POLICY "ref_rs_authenticated_read" ON public.ref_rumah_sakit
    FOR SELECT TO authenticated USING (true);

-- ─── 4. supervisi_rs_sessions: Clean Authenticated Access ──────
-- SELECT: All authenticated users can view sessions
CREATE POLICY "supervisi_rs_sessions_select" ON public.supervisi_rs_sessions
    FOR SELECT TO authenticated USING (true);

-- INSERT / UPDATE / DELETE: All authenticated dashboard users
CREATE POLICY "supervisi_rs_sessions_insert" ON public.supervisi_rs_sessions
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "supervisi_rs_sessions_update" ON public.supervisi_rs_sessions
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "supervisi_rs_sessions_delete" ON public.supervisi_rs_sessions
    FOR DELETE TO authenticated USING (true);

-- ─── 5. supervisi_rs_items: Clean Authenticated Access ─────────
CREATE POLICY "supervisi_rs_items_select" ON public.supervisi_rs_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "supervisi_rs_items_insert" ON public.supervisi_rs_items
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "supervisi_rs_items_update" ON public.supervisi_rs_items
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "supervisi_rs_items_delete" ON public.supervisi_rs_items
    FOR DELETE TO authenticated USING (true);

-- ─── 6. ba_rs_sessions: Clean Authenticated Access ─────────────
CREATE POLICY "ba_rs_sessions_select" ON public.ba_rs_sessions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "ba_rs_sessions_insert" ON public.ba_rs_sessions
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "ba_rs_sessions_update" ON public.ba_rs_sessions
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "ba_rs_sessions_delete" ON public.ba_rs_sessions
    FOR DELETE TO authenticated USING (true);

-- ─── 7. ba_rs_items: Clean Authenticated Access ────────────────
CREATE POLICY "ba_rs_items_select" ON public.ba_rs_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "ba_rs_items_insert" ON public.ba_rs_items
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "ba_rs_items_update" ON public.ba_rs_items
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "ba_rs_items_delete" ON public.ba_rs_items
    FOR DELETE TO authenticated USING (true);
