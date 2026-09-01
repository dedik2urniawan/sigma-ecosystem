-- ─────────────────────────────────────────────────────────────────────────────
-- SIGMA Ecosystem v2.0 — SSO Database Migration
-- Run di Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Tambah kolom modules_access ke app_users
ALTER TABLE app_users
ADD COLUMN IF NOT EXISTS modules_access text[] DEFAULT '{}';

-- 2. Set default modules_access berdasarkan role yang sudah ada
UPDATE app_users SET modules_access = ARRAY['rcs', 'calculator', 'mbg', 'chatbot', 'api_gateway']
WHERE role IN ('superadmin', 'admin_dinkes');

UPDATE app_users SET modules_access = ARRAY['rcs', 'calculator', 'mbg', 'chatbot']
WHERE role IN ('admin_puskesmas', 'user');

UPDATE app_users SET modules_access = ARRAY['api_gateway']
WHERE role = 'mitra_api';

UPDATE app_users SET modules_access = ARRAY['chatbot']
WHERE role = 'chatbot_user';

-- 3. Comment untuk dokumentasi
COMMENT ON COLUMN app_users.modules_access IS 
'Array of module IDs this user can access. Values: rcs, calculator, mbg, chatbot, api_gateway, pkmk';

-- ─── Verifikasi ──────────────────────────────────────────────────────────────
SELECT id, email, role, modules_access FROM app_users ORDER BY role;
