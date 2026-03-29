-- Migration 005: emails table
-- Stores email metadata only — NO email content persisted (NFR8, FR33)

CREATE TABLE IF NOT EXISTS public.emails (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider           TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook', 'imap')),
  provider_email_id  TEXT NOT NULL,
  subject            TEXT,
  from_email         TEXT,
  from_name          TEXT,
  received_at        TIMESTAMPTZ NOT NULL,
  is_read            BOOLEAN NOT NULL DEFAULT false,
  is_archived        BOOLEAN NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT emails_unique_per_provider UNIQUE (user_id, provider, provider_email_id)
);

-- RLS
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY emails_select_owner ON public.emails
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY emails_update_owner ON public.emails
  FOR UPDATE USING (auth.uid() = user_id);

-- Index for inbox ordering (user's emails sorted by date desc)
CREATE INDEX idx_emails_user_received ON public.emails (user_id, received_at DESC);
