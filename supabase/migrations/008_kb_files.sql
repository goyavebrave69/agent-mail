-- Migration 008: kb_files table
-- Tracks uploaded knowledge base files (CSV/Excel) per user.
-- Content is stored in Supabase Storage (bucket: knowledge-base).
-- Indexing is handled by the index-kb Edge Function (story 3.2).

CREATE TABLE IF NOT EXISTS public.kb_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  file_size     INTEGER NOT NULL,
  mime_type     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'ready', 'error')),
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: users can read and delete their own files; INSERT scoped to auth.uid()
ALTER TABLE public.kb_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY kb_files_select_owner ON public.kb_files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY kb_files_insert_owner ON public.kb_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY kb_files_delete_owner ON public.kb_files
  FOR DELETE USING (auth.uid() = user_id);

-- Index for KB file list ordered by upload date
CREATE INDEX idx_kb_files_user_created ON public.kb_files (user_id, created_at DESC);
