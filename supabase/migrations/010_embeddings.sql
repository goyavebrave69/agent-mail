-- Migration 010: embeddings table with pgvector
-- Stores text chunks + vector embeddings from indexed KB files.
-- Used by the RAG pipeline (generate-draft Edge Function) for similarity search.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kb_file_id  UUID NOT NULL REFERENCES public.kb_files(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  embedding   vector(1536) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: users can read their own embeddings; only service_role can INSERT/DELETE
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY embeddings_select_owner ON public.embeddings
  FOR SELECT USING (auth.uid() = user_id);

-- ivfflat index for approximate nearest-neighbour cosine similarity search
CREATE INDEX ON public.embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
