-- Migration 013: drafts table for AI-generated email replies
-- Status tracking: pending → generating → ready | error

CREATE TABLE IF NOT EXISTS public.drafts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_id        UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  content         TEXT,  -- NULL while generating, populated when ready
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'generating', 'ready', 'sent', 'rejected', 'error')),
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  error_message   TEXT,
  retry_count     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT drafts_unique_per_email UNIQUE (user_id, email_id)
);

-- RLS: users can read/update their own drafts
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY drafts_select_owner ON public.drafts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY drafts_update_owner ON public.drafts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY drafts_insert_owner ON public.drafts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY drafts_delete_owner ON public.drafts
  FOR DELETE USING (auth.uid() = user_id);

-- Index for fetching drafts by email
CREATE INDEX idx_drafts_email ON public.drafts (email_id);

-- Index for fetching user's drafts by status
CREATE INDEX idx_drafts_user_status ON public.drafts (user_id, status);
