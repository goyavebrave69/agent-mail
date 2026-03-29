-- Email connections table — stores OAuth and IMAP mailbox connection metadata
-- Tokens/credentials are stored in Supabase Vault; only vault_secret_id is stored here.
CREATE TABLE IF NOT EXISTS public.email_connections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook', 'imap')),
  email         TEXT NOT NULL,
  vault_secret_id TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.email_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies — each user can only see and manage their own connections
CREATE POLICY email_connections_select_owner ON public.email_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY email_connections_insert_owner ON public.email_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY email_connections_delete_owner ON public.email_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Index for efficient lookups by user
CREATE INDEX IF NOT EXISTS idx_email_connections_user_id ON public.email_connections(user_id);

-- Unique constraint to support upsert on reconnection (one connection per provider per user)
ALTER TABLE public.email_connections
  ADD CONSTRAINT email_connections_user_provider_unique UNIQUE (user_id, provider);
