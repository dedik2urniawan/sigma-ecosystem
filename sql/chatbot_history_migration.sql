-- ─────────────────────────────────────────────────────────────────────────────
-- SIGMA Ecosystem v2.0 — Chatbot AI History & Session Persistence
-- Run di Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Tabel chat_threads (Sesi Percakapan Pengguna)
CREATE TABLE IF NOT EXISTS chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Percakapan Baru',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing untuk query cepat berdasarkan user dan waktu
CREATE INDEX IF NOT EXISTS idx_chat_threads_user_id ON chat_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_updated_at ON chat_threads(updated_at DESC);

-- 2. Tabel chat_messages (Isi Percakapan per Sesi)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing untuk pemuatan riwayat pesan urut waktu
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id ON chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at ASC);

-- 3. Row Level Security (RLS) — Isolasi Privasi Ketat Antar Pengguna
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS untuk chat_threads
DROP POLICY IF EXISTS "Users can view own threads" ON chat_threads;
CREATE POLICY "Users can view own threads"
    ON chat_threads FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own threads" ON chat_threads;
CREATE POLICY "Users can insert own threads"
    ON chat_threads FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own threads" ON chat_threads;
CREATE POLICY "Users can update own threads"
    ON chat_threads FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own threads" ON chat_threads;
CREATE POLICY "Users can delete own threads"
    ON chat_threads FOR DELETE
    USING (auth.uid() = user_id);

-- Kebijakan RLS untuk chat_messages
DROP POLICY IF EXISTS "Users can view messages in own threads" ON chat_messages;
CREATE POLICY "Users can view messages in own threads"
    ON chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_threads
            WHERE chat_threads.id = chat_messages.thread_id
            AND chat_threads.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert messages in own threads" ON chat_messages;
CREATE POLICY "Users can insert messages in own threads"
    ON chat_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_threads
            WHERE chat_threads.id = chat_messages.thread_id
            AND chat_threads.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete messages in own threads" ON chat_messages;
CREATE POLICY "Users can delete messages in own threads"
    ON chat_messages FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM chat_threads
            WHERE chat_threads.id = chat_messages.thread_id
            AND chat_threads.user_id = auth.uid()
        )
    );

-- 4. Trigger auto-update timestamp updated_at pada chat_threads
CREATE OR REPLACE FUNCTION update_chat_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_threads
    SET updated_at = NOW()
    WHERE id = NEW.thread_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_chat_thread_timestamp ON chat_messages;
CREATE TRIGGER trg_update_chat_thread_timestamp
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_thread_timestamp();

-- 5. Dokumentasi Komentar
COMMENT ON TABLE chat_threads IS 'Menyimpan sesi percakapan chatbot terisolasi per user.';
COMMENT ON TABLE chat_messages IS 'Menyimpan riwayat pertukaran pesan user dan AI per sesi.';
